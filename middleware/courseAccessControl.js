import Course from '../models/Course.js';
import Subscription from '../models/Subscription.js';
import User from '../models/User.js';

/**
 * Check if user has access to a course
 * Factors: Free courses, premium tiers, subscriptions, team licenses
 */
export const checkCourseAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    // Get course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Free courses - anyone can access
    if (course.tier === 'free' && course.accessType === 'public') {
      req.courseAccess = {
        hasAccess: true,
        course,
        tier: 'free',
        canDownloadResources: true,
        canAccessVideo: true
      };
      return next();
    }

    // Not logged in - no access to paid content
    if (!userId) {
      return res.status(401).json({ 
        message: 'Please log in to access this course',
        requiresLogin: true 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is enrolled or has subscription
    const isEnrolled = user.enrolledCourses?.some(e => e.courseId.toString() === courseId);
    
    // Check active subscription
    const subscription = await Subscription.findOne({
      userId,
      courseId,
      status: 'active'
    });

    // Course creator has full access
    if (course.createdBy.toString() === userId.toString()) {
      req.courseAccess = {
        hasAccess: true,
        course,
        tier: course.tier,
        isCreator: true,
        canDownloadResources: true,
        canAccessVideo: true
      };
      return next();
    }

    // Check access levels
    if (isEnrolled || subscription) {
      req.courseAccess = {
        hasAccess: true,
        course,
        tier: course.tier,
        subscription,
        enrollmentDate: isEnrolled ? 'enrolled' : subscription?.startDate,
        canDownloadResources: true,
        canAccessVideo: true,
        accessType: subscription?.subscriptionType || 'enrolled'
      };
      return next();
    }

    // Admins have full access
    if (user.role === 'admin') {
      req.courseAccess = {
        hasAccess: true,
        course,
        tier: course.tier,
        isAdmin: true,
        canDownloadResources: true,
        canAccessVideo: true
      };
      return next();
    }

    // No access
    return res.status(403).json({
      message: `This is a ${course.tier} course. Please purchase or subscribe to access.`,
      course: {
        _id: course._id,
        title: course.title,
        tier: course.tier,
        pricing: course.pricing,
        accessType: course.accessType
      },
      requiresPurchase: true
    });

  } catch (error) {
    console.error('Course access check error:', error);
    res.status(500).json({ message: 'Error checking access' });
  }
};

/**
 * Check if user can download resources
 */
export const checkResourceAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Free courses - anyone can download
    if (course.tier === 'free') {
      return next();
    }

    // Require login for premium
    if (!userId) {
      return res.status(401).json({ message: 'Please log in to download resources' });
    }

    // Check subscription/enrollment
    const user = await User.findById(userId);
    const subscription = await Subscription.findOne({
      userId,
      courseId,
      status: 'active'
    });

    const isEnrolled = user.enrolledCourses?.some(e => e.courseId.toString() === courseId);
    const isCreator = course.createdBy.toString() === userId.toString();

    if (isEnrolled || subscription || isCreator || user.role === 'admin') {
      return next();
    }

    return res.status(403).json({ 
      message: 'You do not have access to download resources from this course' 
    });

  } catch (error) {
    console.error('Resource access check error:', error);
    res.status(500).json({ message: 'Error checking resource access' });
  }
};

/**
 * Check if user can access video content
 */
export const checkVideoAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?._id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Free courses - anyone can watch
    if (course.tier === 'free') {
      return next();
    }

    // Require login for premium videos
    if (!userId) {
      return res.status(401).json({ message: 'Please log in to watch video' });
    }

    // Check access
    const user = await User.findById(userId);
    const subscription = await Subscription.findOne({
      userId,
      courseId,
      status: 'active'
    });

    const isEnrolled = user.enrolledCourses?.some(e => e.courseId.toString() === courseId);
    const isCreator = course.createdBy.toString() === userId.toString();

    if (isEnrolled || subscription || isCreator || user.role === 'admin') {
      return next();
    }

    return res.status(403).json({ 
      message: 'You do not have access to videos in this course' 
    });

  } catch (error) {
    console.error('Video access check error:', error);
    res.status(500).json({ message: 'Error checking video access' });
  }
};

export default {
  checkCourseAccess,
  checkResourceAccess,
  checkVideoAccess
};
