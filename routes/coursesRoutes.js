import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Course from "../models/Course.js";
import mongoose from 'mongoose';
import UserProgress from "../models/UserProgress.js";
import Certificate from "../models/Certificate.js";
import User from "../models/User.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { sendEmail } from "../utils/sendEmail.js";
import { courseCompletionEmail, courseCompletionText } from "../utils/emailTemplates.js";
import dotenv from "dotenv";
const router = express.Router();

dotenv.config();

// Helper: resolve a course identifier (either ObjectId or slug/title) to a Course document
const resolveCourse = async (identifier) => {
  if (!identifier) return null;
  // If it's a valid ObjectId, try to find by _id first
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const byId = await Course.findById(identifier);
    if (byId) return byId;
  }

  // Otherwise try slug match (or title as fallback). Decode in case of URL encoding.
  const decoded = decodeURIComponent(identifier);
  let bySlug = await Course.findOne({ slug: decoded });
  if (bySlug) return bySlug;
  const byTitle = await Course.findOne({ title: decoded });
  return byTitle;
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize S3 client for Backblaze B2
const s3Client = new S3Client({
  region: 'us-east-005',
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
  forcePathStyle: true,
});

// Helper: upload file to B2
const uploadToB2 = async (file, folder = 'courses') => {
  const uniqueFileName = `${folder}/${Date.now()}-${file.originalname}`;
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await s3Client.send(command);
    // Return B2 URL
    const b2Url = `https://${process.env.B2_BUCKET_NAME}.s3.us-east-005.backblazeb2.com/${uniqueFileName}`;
    return { fileName: uniqueFileName, url: b2Url };
  } catch (error) {
    console.error('B2 Upload Error:', error);
    throw new Error('Failed to upload file. Please try again.');
  }
};

// Helper: delete file from B2
const deleteFromB2 = async (fileId) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: fileId,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error('B2 Delete Error:', error);
  }
};

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get all courses (public - only published)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ status: 'published' }).select('-modules.lessons.content -modules.lessons.contentBlocks -modules.lessons.quiz -finalExam');
    res.json(courses);
  } catch (err) {
    console.error('Fetch courses error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Unable to fetch courses. Please try again later.' 
    });
  }
});

// Get a single course by ID or slug/title
router.get('/:id', async (req, res) => {
  try {
    const course = await resolveCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found.' 
      });
    }
    res.json(course);
  } catch (err) {
    console.error('Fetch course error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Unable to fetch course. Please try again later.' 
    });
  }
});

// Get signed URL for course image
router.get('/:id/image/url', async (req, res) => {
  try {
    const course = await resolveCourse(req.params.id);
    if (!course || !course.imageB2FileId) {
      return res.status(404).json({ 
        success: false,
        message: 'Course or image not found.' 
      });
    }

    // Generate signed URL for course image (valid for 24 hours)
    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: course.imageB2FileId,
    });

    const imageUrl = await getSignedUrl(s3Client, command, { expiresIn: 86400 });
    
    res.json({ 
      success: true,
      imageUrl,
      fileName: course.title
    });
  } catch (err) {
    console.error('Get image URL error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get image URL.' 
    });
  }
});

// ============================================================
// USER ROUTES (Protected)
// ============================================================

// Enroll user in a course
router.post('/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const course = await resolveCourse(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    const courseId = course._id.toString();

    // Create or get user progress
    let progress = await UserProgress.findOne({ userId, courseId });
    if (!progress) {
      progress = new UserProgress({ userId, courseId });
      await progress.save();
    }

    // Also add to user's enrolledCourses array if not already there
    const user = await User.findById(userId);
    if (user) {
      const alreadyEnrolled = user.enrolledCourses.some(
        ec => ec.courseId.toString() === courseId
      );
      if (!alreadyEnrolled) {
        user.enrolledCourses.push({
          courseId,
          enrolledAt: new Date(),
          lastAccessed: new Date(),
        });
        await user.save();
      }
    }

    res.json({ 
      success: true,
      message: 'Successfully enrolled in course!',
      progress 
    });
  } catch (err) {
    console.error('Enroll course error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to enroll in course. Please try again.' 
    });
  }
});

// Track lesson completion
router.post('/:courseId/lesson/:lessonId/complete', authMiddleware, async (req, res) => {
  try {
    const { courseId: courseParam, lessonId } = req.params;
    const { quizScore = 0 } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!lessonId) {
      return res.status(400).json({ success: false, message: 'Lesson ID is required.' });
    }

    const course = await resolveCourse(courseParam);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    
    // Verify lesson exists in the course
    let lessonExists = false;
    for (const module of course.modules) {
      if (module.lessons.some(l => l._id.toString() === lessonId || l.order === parseInt(lessonId))) {
        lessonExists = true;
        break;
      }
    }
    
    if (!lessonExists) {
      return res.status(404).json({ success: false, message: 'Lesson not found in this course.' });
    }

    const courseId = course._id.toString();

    let progress = await UserProgress.findOne({ userId, courseId });
    if (!progress) {
      progress = new UserProgress({ userId, courseId, completedLessons: [] });
    }

    // Check if lesson is already completed to avoid duplicates
    const existingLessonIndex = progress.completedLessons.findIndex(
      l => l.lessonId === lessonId || l.lessonId.toString() === lessonId.toString()
    );
    
    if (existingLessonIndex === -1) {
      // Lesson not yet completed, add it
      progress.completedLessons.push({ 
        lessonId, 
        completedAt: new Date(), 
        quizScore: quizScore || 0 
      });
    } else {
      // Lesson already completed, update quiz score if higher
      if (quizScore && quizScore > (progress.completedLessons[existingLessonIndex].quizScore || 0)) {
        progress.completedLessons[existingLessonIndex].quizScore = quizScore;
      }
    }
    
    progress.lastAccessed = new Date();
    await progress.save();

    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const isCourseComplete = progress.completedLessons.length === totalLessons;

    let certificate = null;
    if (isCourseComplete) {
      const existingCert = await Certificate.findOne({ userId, courseId });
      if (!existingCert) {
        const user = await User.findById(userId);
        // Generate a unique certificate number (e.g., VA-20250111-UUID)
        const certificateNumber = `VA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        certificate = new Certificate({
          userId,
          courseId,
          courseTitle: course.title,
          userName: user.username || user.name || 'User',
          certificateNumber,
          quizScores: new Map(progress.completedLessons.map(l => [l.lessonId, l.quizScore || 0])),
          totalQuizScore: Math.round(
            progress.completedLessons.reduce((sum, l) => sum + (l.quizScore || 0), 0) / 
            progress.completedLessons.length
          ),
        });
        await certificate.save();
        
        // Send congratulations email
        try {
          const certificateUrl = `${process.env.FRONTEND_URL || 'https://vervehub.com'}/v/my-certificates`;
          const htmlEmail = courseCompletionEmail(
            user.username || user.name || 'Learner',
            course.title,
            certificateNumber,
            certificateUrl
          );
          const textEmail = courseCompletionText(
            user.username || user.name || 'Learner',
            course.title,
            certificateNumber,
            certificateUrl
          );
          
          await sendEmail({
            to: user.email,
            subject: `🎉 Congratulations! You've Completed "${course.title}" - Verve Hub`,
            html: htmlEmail,
            text: textEmail
          });
          
          console.log(`Congratulations email sent to ${user.email} for course ${course.title}`);
        } catch (emailError) {
          console.error('Failed to send congratulations email:', emailError);
          // Don't fail the entire request if email fails, just log it
        }
      } else {
        certificate = existingCert;
      }
    }

    res.json({ 
      success: true,
      message: isCourseComplete ? 'Congratulations! Course completed!' : 'Lesson marked as complete!',
      progress, 
      isCourseComplete, 
      certificate 
    });
  } catch (err) {
    console.error('Complete lesson error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to complete lesson. Please try again.' 
    });
  }
});

// Get user progress for a course
router.get('/:id/progress', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const course = await resolveCourse(id);
    if (!course) return res.json({ completedLessons: [] });
    const progress = await UserProgress.findOne({ userId, courseId: course._id.toString() });
    res.json(progress || { completedLessons: [] });
  } catch (err) {
    console.error('Fetch progress error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Unable to fetch progress. Please try again.' 
    });
  }
});

// Get all user's certificates (MUST be before /:courseId/certificate)
router.get('/user/all-certificates', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const certificates = await Certificate.find({ userId })
      .populate('courseId', 'title')
      .sort({ completionDate: -1 });
    
    res.json({ 
      success: true,
      certificates 
    });
  } catch (err) {
    console.error('Fetch certificates error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Unable to fetch certificates. Please try again.' 
    });
  }
});

// Get user's certificate for a specific course
router.get('/:courseId/certificate', authMiddleware, async (req, res) => {
  try {
    const { courseId: courseParam } = req.params;
    const userId = req.user.id;

    const course = await resolveCourse(courseParam);
    if (!course) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    const certificate = await Certificate.findOne({ userId, courseId: course._id.toString() });
    if (!certificate) {
      return res.status(404).json({ 
        success: false,
        message: 'Certificate not found. Complete the course to earn a certificate!' 
      });
    }

    res.json({ 
      success: true,
      certificate 
    });
  } catch (err) {
    console.error('Fetch certificate error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Unable to fetch certificate. Please try again.' 
    });
  }
});

// Update certificate download status
router.post('/:courseId/certificate/download', authMiddleware, async (req, res) => {
  try {
    const { courseId: courseParam } = req.params;
    const userId = req.user.id;

    const course = await resolveCourse(courseParam);
    if (!course) return res.status(404).json({ success: false, message: 'Certificate not found.' });

    const certificate = await Certificate.findOne({ userId, courseId: course._id.toString() });
    if (!certificate) {
      return res.status(404).json({ 
        success: false,
        message: 'Certificate not found.' 
      });
    }

    certificate.isDownloaded = true;
    certificate.downloadedAt = new Date();
    await certificate.save();

    res.json({ 
      success: true,
      message: 'Certificate downloaded successfully!',
      certificate 
    });
  } catch (err) {
    console.error('Download certificate error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to download certificate. Please try again.' 
    });
  }
});

// ============================================================
// ADMIN ROUTES (Protected + Admin)
// ============================================================

// Admin: Create a new course
router.post('/', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, description, modules, finalExam, status = 'draft' } = req.body;
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ 
        success: false,
        message: 'Course title is required.' 
      });
    }
    
    let imageUrl = null;
    let imageB2FileId = null;

    // Upload image to B2 if provided
    if (req.file) {
      try {
        const uploaded = await uploadToB2(req.file, 'courses/images');
        imageUrl = uploaded.url;
        imageB2FileId = uploaded.fileName;
      } catch (uploadErr) {
        return res.status(400).json({ 
          success: false,
          message: 'Failed to upload course image. Please try again.' 
        });
      }
    }

    // Accept modules as either a JSON string (from multipart/form-data) or an object/array (from application/json)
    let parsedModules = [];
    if (modules) {
      if (typeof modules === 'string') {
        try {
          parsedModules = JSON.parse(modules);
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid modules JSON.' });
        }
      } else if (Array.isArray(modules) || typeof modules === 'object') {
        parsedModules = modules;
      }
    }

    // Parse finalExam if it's a string
    let parsedFinalExam = null;
    if (finalExam) {
      if (typeof finalExam === 'string') {
        try {
          parsedFinalExam = JSON.parse(finalExam);
        } catch (e) {
          return res.status(400).json({ success: false, message: 'Invalid final exam JSON.' });
        }
      } else {
        parsedFinalExam = finalExam;
      }
    }

    const course = new Course({
      title,
      description,
      imageUrl,
      imageB2FileId,
      modules: parsedModules,
      finalExam: parsedFinalExam,
      status,
      createdBy: req.user.id,
    });

    await course.save();
    res.status(201).json({ 
      success: true,
      message: 'Course created successfully!',
      course 
    });
  } catch (err) {
    console.error('Create course error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to create course. Please check your input and try again.' 
    });
  }
});

// Admin: Update a course
router.put('/:id', authMiddleware, adminMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { title, description, status } = req.body;
    let modules = req.body.modules;
    let finalExam = req.body.finalExam;
    
    // Parse modules if it's a JSON string (from FormData)
    if (typeof modules === 'string') {
      try {
        modules = JSON.parse(modules);
      } catch (e) {
        console.error('Invalid modules JSON:', e);
        return res.status(400).json({ success: false, message: 'Invalid modules JSON.' });
      }
    }
    
    // Parse finalExam if it's a JSON string
    if (typeof finalExam === 'string') {
      try {
        finalExam = JSON.parse(finalExam);
      } catch (e) {
        console.error('Invalid finalExam JSON:', e);
      }
    }
    
    const course = await resolveCourse(req.params.id);

    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found.' 
      });
    }

    // Update basic fields
    if (title) course.title = title;
    if (description) course.description = description;
    if (status && ['draft', 'published'].includes(status)) course.status = status;
    if (modules) {
      // Accept modules as either a JSON string or an object/array
      let parsedModules;
      if (typeof modules === 'string') {
        try {
          parsedModules = JSON.parse(modules);
        } catch {
          return res.status(400).json({ 
            success: false,
            message: 'Invalid modules format.' 
          });
        }
      } else if (Array.isArray(modules) || typeof modules === 'object') {
        parsedModules = modules;
      }
      
      if (parsedModules) {
        // Merge with existing modules data to preserve fields not in the update
        course.modules = parsedModules.map((newModule, moduleIdx) => {
          const existingModule = course.modules[moduleIdx];
          if (!existingModule) {
            // New module, return as-is
            return newModule;
          }
          // Merge new module data with existing to preserve missing fields
          const mergedModule = {
            ...existingModule.toObject ? existingModule.toObject() : existingModule,
            ...newModule,
            title: newModule.title || existingModule.title,
            lessons: (newModule.lessons || []).map((newLesson, lessonIdx) => {
              const existingLesson = existingModule.lessons && existingModule.lessons[lessonIdx];
              if (!existingLesson) {
                return newLesson;
              }
              // Merge lesson data preserving all required fields
              return {
                ...existingLesson.toObject ? existingLesson.toObject() : existingLesson,
                ...newLesson,
                title: newLesson.title || existingLesson.title
              };
            })
          };
          return mergedModule;
        });
      }
    }

    // Update finalExam
    if (finalExam !== undefined) {
      if (typeof finalExam === 'string') {
        try {
          course.finalExam = JSON.parse(finalExam);
        } catch {
          return res.status(400).json({ 
            success: false,
            message: 'Invalid final exam format.' 
          });
        }
      } else {
        course.finalExam = finalExam;
      }
    }

    // Handle image update
    if (req.file) {
      try {
        // Delete old image from B2
        if (course.imageB2FileId) {
          await deleteFromB2(course.imageB2FileId);
        }
        const uploaded = await uploadToB2(req.file, 'courses/images');
        course.imageUrl = uploaded.url;
        course.imageB2FileId = uploaded.fileName;
      } catch (uploadErr) {
        return res.status(400).json({ 
          success: false,
          message: 'Failed to upload new course image. Please try again.' 
        });
      }
    }

    course.updatedAt = new Date();
    await course.save();
    res.json({ 
      success: true,
      message: 'Course updated successfully!',
      course 
    });
  } catch (err) {
    console.error('Update course error:', err);
    res.status(400).json({ 
      success: false,
      message: 'Failed to update course. Please try again.' 
    });
  }
});

// Admin: Delete a course
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found.' 
      });
    }
    
    // Delete all files from B2
    if (course.imageB2FileId) {
      await deleteFromB2(course.imageB2FileId);
    }
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (lesson.contentB2FileId) {
          await deleteFromB2(lesson.contentB2FileId);
        }
      }
    }

    await Course.findByIdAndDelete(course._id);
    res.json({ 
      success: true,
      message: 'Course deleted successfully!' 
    });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete course. Please try again.' 
    });
  }
});

// Admin: Upload lesson content to B2
router.post('/:courseId/lessons/:lessonId/upload-content', authMiddleware, adminMiddleware, upload.single('content'), async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file selected. Please upload a file.' 
      });
    }

    // Upload to B2
    let uploaded;
    try {
      uploaded = await uploadToB2(req.file, 'courses/lessons');
    } catch (uploadErr) {
      return res.status(400).json({ 
        success: false,
        message: 'Failed to upload lesson content. Please try again.' 
      });
    }
    
    // Update course with content URL (resolve by id or slug/title)
    const course = await resolveCourse(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        message: 'Course not found.' 
      });
    }

    // Find and update lesson
    let found = false;
    for (const module of course.modules) {
      const lesson = module.lessons.find(l => l._id.toString() === lessonId);
      if (lesson) {
        // Delete old content from B2 if exists
        if (lesson.contentB2FileId) {
          await deleteFromB2(lesson.contentB2FileId);
        }
        lesson.contentUrl = uploaded.url;
        lesson.contentB2FileId = uploaded.fileName;
        lesson.content = null; // Clear inline content
        found = true;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ 
        success: false,
        message: 'Lesson not found in this course.' 
      });
    }

    course.updatedAt = new Date();
    await course.save();
    res.json({ 
      success: true,
      message: 'Lesson content uploaded successfully!',
      url: uploaded.url 
    });
  } catch (err) {
    console.error('Upload content error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to upload lesson content. Please try again.' 
    });
  }
});

// Track resource download
router.post('/:courseId/lessons/:lessonId/resources/:resourceIndex/download', authMiddleware, async (req, res) => {
  try {
    const { courseId, lessonId, resourceIndex } = req.params;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Find the lesson
    let found = false;
    for (const module of course.modules) {
      const lesson = module.lessons.find(l => l._id.toString() === lessonId);
      if (lesson && lesson.resources && lesson.resources[resourceIndex]) {
        // Increment download count
        if (!lesson.resources[resourceIndex].downloadCount) {
          lesson.resources[resourceIndex].downloadCount = 0;
        }
        lesson.resources[resourceIndex].downloadCount += 1;
        found = true;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    await course.save();
    res.json({ 
      success: true,
      message: 'Download tracked' 
    });
  } catch (error) {
    console.error('Download tracking error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// QUIZ SUBMISSION ENDPOINTS
// ============================================================

// Submit lesson quiz
router.post('/:courseId/lessons/:lessonId/quiz/submit', authMiddleware, async (req, res) => {
  try {
    const { courseId: courseParam, lessonId } = req.params;
    const { answers } = req.body; // answers = { 0: 'option1', 1: 'option2', ... }
    const userId = req.user.id;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Quiz answers required in correct format' 
      });
    }

    const course = await resolveCourse(courseParam);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Find the lesson
    let lesson = null;
    for (const module of course.modules) {
      const found = module.lessons.find(l => l._id.toString() === lessonId);
      if (found) {
        lesson = found;
        break;
      }
    }

    if (!lesson || !lesson.quiz || lesson.quiz.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Quiz not found for this lesson' 
      });
    }

    // Calculate score
    let correctCount = 0;
    const detailedResults = lesson.quiz.map((question, idx) => {
      const userAnswer = answers[idx];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        userAnswer: userAnswer || null,
        isCorrect,
        explanation: question.explanation
      };
    });

    const score = Math.round((correctCount / lesson.quiz.length) * 100);

    // Record the quiz attempt
    const progress = await UserProgress.findOne({ userId, courseId: course._id });
    if (progress) {
      const existingIdx = progress.completedLessons.findIndex(l => l.lessonId.toString() === lessonId);
      if (existingIdx >= 0) {
        // Update with better score
        if (score > (progress.completedLessons[existingIdx].quizScore || 0)) {
          progress.completedLessons[existingIdx].quizScore = score;
        }
      } else {
        progress.completedLessons.push({
          lessonId,
          completedAt: new Date(),
          quizScore: score
        });
      }
      await progress.save();
    }

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      score,
      correctCount,
      totalQuestions: lesson.quiz.length,
      detailedResults,
      passed: score >= 70 // Default passing score 70%
    });
  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit quiz' 
    });
  }
});

// ============================================================
// FINAL EXAM SUBMISSION ENDPOINTS
// ============================================================

// Submit final exam
router.post('/:courseId/exam/submit', authMiddleware, async (req, res) => {
  try {
    const { courseId: courseParam } = req.params;
    const { answers } = req.body; // answers = { 0: 'option1', 1: 'option2', ... }
    const userId = req.user.id;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ 
        success: false, 
        message: 'Exam answers required in correct format' 
      });
    }

    const course = await resolveCourse(courseParam);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const exam = course.finalExam;
    if (!exam || !exam.isEnabled) {
      return res.status(404).json({ 
        success: false, 
        message: 'Final exam is not enabled for this course' 
      });
    }

    if (!exam.questions || exam.questions.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No exam questions found' 
      });
    }

    // Calculate score
    let correctCount = 0;
    const detailedResults = exam.questions.map((question, idx) => {
      const userAnswer = answers[idx];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        userAnswer: userAnswer || null,
        isCorrect,
        explanation: question.explanation
      };
    });

    const score = Math.round((correctCount / exam.questions.length) * 100);
    const passed = score >= (exam.passingScore || 70);

    // Record the exam attempt
    const progress = await UserProgress.findOne({ userId, courseId: course._id });
    if (progress) {
      if (!progress.examAttempts) progress.examAttempts = [];
      progress.examAttempts.push({
        score,
        attemptDate: new Date(),
        passed
      });
      progress.finalExamScore = score;
      progress.finalExamPassed = passed;
      await progress.save();
    }

    // If passed, generate certificate
    let certificate = null;
    if (passed) {
      const existingCert = await Certificate.findOne({ userId, courseId: course._id });
      if (!existingCert) {
        const certificateNumber = `VA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        certificate = new Certificate({
          userId,
          courseId: course._id,
          courseTitle: course.title,
          userName: req.user.name || 'Learner',
          certificateNumber,
          completionDate: new Date(),
          totalQuizScore: score
        });
        await certificate.save();

        // Send certificate email
        const user = await User.findById(userId);
        if (user && user.email) {
          const { courseCompletionEmail } = await import("../utils/emailTemplates.js");
          try {
            await sendEmail(
              user.email,
              'Certificate Earned! 🎓',
              courseCompletionEmail(user.name, course.title, certificateNumber)
            );
          } catch (emailError) {
            console.error('Failed to send certificate email:', emailError);
          }
        }
      } else {
        certificate = existingCert;
      }
    }

    res.json({
      success: true,
      message: passed ? 'Exam passed! Certificate earned!' : 'Exam submitted',
      score,
      correctCount,
      totalQuestions: exam.questions.length,
      passingScore: exam.passingScore || 70,
      passed,
      detailedResults,
      certificate: passed ? certificate : null
    });
  } catch (error) {
    console.error('Exam submission error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to submit exam' 
    });
  }
});

// Get exam attempt history
router.get('/:courseId/exam/attempts', authMiddleware, async (req, res) => {
  try {
    const { courseId: courseParam } = req.params;
    const userId = req.user.id;

    const course = await resolveCourse(courseParam);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    const progress = await UserProgress.findOne({ userId, courseId: course._id });
    if (!progress) {
      return res.json({
        success: true,
        attempts: [],
        message: 'No exam attempts yet'
      });
    }

    res.json({
      success: true,
      attempts: progress.examAttempts || [],
      bestScore: Math.max(...(progress.examAttempts || []).map(a => a.score || 0), 0),
      passed: progress.finalExamPassed || false
    });
  } catch (error) {
    console.error('Get exam attempts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch exam attempts' 
    });
  }
});

export default router;
