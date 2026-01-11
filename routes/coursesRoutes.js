import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find().select('-modules.lessons.content');
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
    const { title, description, modules } = req.body;
    
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

    const course = new Course({
      title,
      description,
      imageUrl,
      imageB2FileId,
      modules: parsedModules,
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
    const { title, description, modules } = req.body;
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
    if (modules) {
      // Accept modules as either a JSON string or an object/array
      if (typeof modules === 'string') {
        try {
          course.modules = JSON.parse(modules);
        } catch {
          return res.status(400).json({ 
            success: false,
            message: 'Invalid modules format.' 
          });
        }
      } else if (Array.isArray(modules) || typeof modules === 'object') {
        course.modules = modules;
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

export default router;
