/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import express from "express";
import Users from "../models/Users.js";
import User from "../models/User.js";
import Post from "../models/Post.js";
import ReadingHistory from "../models/ReadingHistory.js";
import UserProgress from "../models/UserProgress.js";
import Course from "../models/Course.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import cloudinary from "../config/cloudinary.js"; 
import { UAParser } from "ua-parser-js";
import geoip from "geoip-lite";
import crypto from "crypto";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

// ------------------ MULTER SETUP FOR AVATAR UPLOADS ------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ------------------ SIGNUP ------------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    // Create user
    const user = new Users({
      name,
      email,
      password,
      emailVerified: false,
      authProvider: "local",
    });
    await user.save();

    // --- Generate email verification token ---
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();
	const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

	await sendEmail({
	  to: user.email,
	  subject: "Verify your Verve Hub account",
	  html: `
	  <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
		<tr>
		  <td>
			<table align="center" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0;">
			  </tr>
			  <!-- Greeting -->
			  <tr>
				<td style="padding: 0 30px 20px 30px;">
				  <h2 style="color: #333333; text-align: center;">Welcome to Verve Hub, ${user.name || 'there'}!</h2>
				  <p style="font-size: 16px; color: #555555; line-height: 1.5;">
					Thank you for creating an account. Please verify your email address to get started.
				  </p>
				</td>
			  </tr>
			  <!-- Button -->
			  <tr>
				<td style="text-align: center; padding: 20px 30px;">
				  <a href="${verifyUrl}" 
					 style="background-color: #007BFF; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; display: inline-block; font-weight: bold;">
					Verify Email
				  </a>
				</td>
			  </tr>
			  <!-- Footer -->
			  <tr>
				<td style="padding: 20px 30px; font-size: 12px; color: #999999; text-align: center; line-height: 1.4;">
				  If you did not sign up for Verve Hub, please ignore this email.<br>
				  &copy; ${new Date().getFullYear()} Verve Hub. All rights reserved.<br>
				  345 Tom Mboya Street, Nairobi, Kenya<br>
				  Need help? <a href="mailto:vervehubwriteups@gmail.com" style="color: #007BFF; text-decoration: none;">Contact Support</a>
				</td>
			  </tr>
			</table>
		  </td>
		</tr>
	  </table>
	  `,
	  text: `Welcome to Verve Hub, ${user.name || 'there'}!\n\nPlease verify your email by clicking the link below:\n${verifyUrl}\n\nIf you did not sign up, ignore this email.\n\nSupport: support@yourdomain.com\nAddress: 123 Blue Street, Nairobi, Kenya`,
	});

    // --- Respond without JWT, force email verification first ---
    res.status(201).json({
      success: true,
      message: "Account created successfuly. Please verify your email.",
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to create account. Please retry." });
  }
});


// ------------------ LOGIN ------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await Users.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    // --- Block login if email not verified ---
    if (!user.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please check your inbox.",
      });
    }

    // 🔐 Create JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 🧠 Session info
    const sessionId = jwt.decode(token).iat.toString(); // simple unique id

    // Parse user agent
    const parser = new UAParser(req.headers["user-agent"]);
    const browser = parser.getBrowser().name || "Unknown";
    const device = parser.getDevice().type === "mobile" ? "Mobile" : "Desktop";

    // Get IP address
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress;

    // Lookup location with geoip-lite
    let location = "Unknown";
    const geo = geoip.lookup(ipAddress);
    if (geo) {
      location = `${geo.city || "Unknown City"}, ${geo.country || "Unknown Country"}`;
    }

    // Mark all sessions inactive
    user.sessions.forEach((s) => (s.isCurrent = false));

    // Add new session
    user.sessions.push({
      sessionId,
      device,
      browser,
      ipAddress,
      location,
      lastActive: new Date(),
      isCurrent: true,
    });

    await user.save();

    // ✅ Return JWT + user role
	res.json({
	  success: true,
	  token,
	  user: {
		id: user._id,
		role: user.role,
	  },
	});
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
});

// ------------------ VERIFY EMAIL ------------------
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token to match DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with matching token and valid expiry
    const user = await Users.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification link",
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({
      success: false,
      message: "Email verification failed",
    });
  }
});
// ------------------ RESEND VERIFICATION EMAIL ------------------
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    await sendEmail({
      to: user.email,
      subject: "Resend: Verify your Verve Hub account",
      html: `
        <h3>Verify your email</h3>
        <p>Click the link below to verify your account:</p>
        <a href="${verifyUrl}">Verify Email</a>
      `,
    });

    res.json({
      success: true,
      message: "Verification email resent. Please check your inbox.",
    });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email",
    });
  }
});


// ------------------ GET PROFILE ------------------
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------ GET CURRENT USER ------------------
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET CURRENT USER - /v alias
router.get("/v", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Track reading activity - Call when user opens an article
router.post("/track-reading/:postId", authMiddleware, async (req, res) => {
  try {
    const { timeSpent, progress } = req.body;
    const { postId } = req.params;

    // Create or update reading history record
    const readingRecord = await ReadingHistory.findOneAndUpdate(
      { userId: req.user.id, postId },
      {
        timeSpent: timeSpent || 0,
        progress: progress || 0,
        readAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Increment post views if it's a new reading record
    if (readingRecord.isNew || !readingRecord._id) {
      await Post.findByIdAndUpdate(postId, { $inc: { views: 1 } });
    }

    res.json({ message: "Reading tracked successfully", record: readingRecord });
  } catch (error) {
    console.error("Reading tracking error:", error);
    res.status(500).json({ message: "Failed to track reading" });
  }
});

router.get("/", async (req, res) => {
  const users = await Users.find().select("-password");
  res.json(users);
});

// Search users by name or email
router.get("/search", async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ users: [] });
    }

    const users = await Users.find({
      $or: [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { bio: { $regex: q, $options: "i" } },
      ],
    })
      .select("-password")
      .limit(parseInt(limit))
      .lean();

    res.json({ users });
  } catch (error) {
    console.error("User search error:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
});

// Get dashboard stats for current user
router.get("/dashboard-stats", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Get user's posts
    const userPosts = await Post.find({ authorId: req.user.id });
    
    const totalViews = userPosts.reduce((sum, post) => sum + (post.views || 0), 0);
    const totalLikes = userPosts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const totalComments = userPosts.reduce((sum, post) => sum + ((post.comments && post.comments.length) || 0), 0);

    // Get views and comments this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const postsThisMonth = userPosts.filter(p => new Date(p.createdAt) >= thisMonth);
    const viewsThisMonth = postsThisMonth.reduce((sum, post) => sum + (post.views || 0), 0);
    const commentsThisMonth = postsThisMonth.reduce((sum, post) => sum + ((post.comments && post.comments.length) || 0), 0);

    // Get recent posts (last 5)
    const recentPosts = userPosts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(p => ({
        _id: p._id,
        title: p.title,
        views: p.views || 0,
        likes: p.likes || 0,
        createdAt: p.createdAt
      }));

    // Calculate reading stats from ReadingHistory
    const readingHistory = await ReadingHistory.find({ userId: req.user.id });
    const articlesRead = readingHistory.length;
    const hoursSpent = Math.round(readingHistory.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / 3600) || 0;
    const averageReadTime = articlesRead > 0 ? Math.round(readingHistory.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / articlesRead / 60) : 0;

    res.json({
      userId: user._id,
      name: user.name || "User",
      email: user.email,
      level: user.level || "beginner",
      totalPosts: userPosts.length,
      totalViews,
      totalLikes,
      totalComments,
      viewsThisMonth,
      commentsThisMonth,
      postsPublished: userPosts.length,
      recentPosts,
      readingStats: {
        articlesRead,
        hoursSpent,
        averageReadTime
      },
      badges: user.badges || [],
      joinDate: user.createdAt,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
});


// ------------------ UPDATE PROFILE ------------------
router.put("/me", authMiddleware, upload.single("profileImage"), async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = { name, email };

    // If avatar file exists, upload to Cloudinary
    if (req.file) {
      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "avatars" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      updateData.profileImage = uploaded.secure_url; 
    }

    const updatedUser = await Users.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

// ------------------ CHANGE PASSWORD ------------------
router.put("/me/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await Users.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // 👈 let pre-save hook hash it
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ message: "Password update failed" });
  }
});


// ------------------ DELETE ACCOUNT ------------------
router.delete("/me", authMiddleware, async (req, res) => {
  try {
    await Users.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Account deletion failed" });
  }
});

// ------------------ GET PREFERENCES ------------------
router.get("/me/preferences", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({
      success: true,
      themeSettings: user.themeSettings,
      notificationSettings: user.notificationSettings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to fetch preferences" });
  }
});

// ------------------ UPDATE PREFERENCES ------------------
router.put("/me/preferences", authMiddleware, async (req, res) => {
  try {
    const { themeSettings, notificationSettings } = req.body;
    
    const updateData = {};
    
    if (themeSettings) {
      updateData.themeSettings = {
        theme: themeSettings.theme || "system",
        contrast: themeSettings.contrast || "normal",
        fontSize: themeSettings.fontSize || 100,
        useSystemFont: themeSettings.useSystemFont || false,
        animationReduces: themeSettings.animationReduces || false,
      };
    }
    
    if (notificationSettings) {
      updateData.notificationSettings = {
        emailNotifications: notificationSettings.emailNotifications !== undefined ? notificationSettings.emailNotifications : true,
        newPostNotifications: notificationSettings.newPostNotifications !== undefined ? notificationSettings.newPostNotifications : true,
        likeNotifications: notificationSettings.likeNotifications !== undefined ? notificationSettings.likeNotifications : true,
        commentNotifications: notificationSettings.commentNotifications !== undefined ? notificationSettings.commentNotifications : true,
        shareNotifications: notificationSettings.shareNotifications !== undefined ? notificationSettings.shareNotifications : true,
      };
    }
    
    const user = await Users.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("-password");

    res.json({
      success: true,
      message: "Preferences updated successfully",
      themeSettings: user.themeSettings,
      notificationSettings: user.notificationSettings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update preferences" });
  }
});

// ------------------ GET SESSIONS ------------------
router.get("/me/sessions", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select("sessions");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ sessions: user.sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

// ------------------ REVOKE SESSION ------------------
router.delete("/me/sessions/:sessionId", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.sessions = user.sessions.filter(s => s.sessionId !== req.params.sessionId);
    await user.save();

    res.json({ message: "Session revoked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to revoke session" });
  }
});

// ------------------ REVOKE ALL SESSIONS ------------------
router.delete("/me/sessions/all", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.sessions = user.sessions.filter(s => s.isCurrent); 
    await user.save();

    res.json({ message: "All other sessions revoked successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to revoke sessions" });
  }
});

// ------------------ GET USER'S ENROLLED COURSES ------------------
router.get("/courses/enrolled", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user with populated enrolled courses
    const user = await User.findById(userId).populate('enrolledCourses.courseId');
    
    if (!user || !user.enrolledCourses || user.enrolledCourses.length === 0) {
      return res.json({ 
        success: true,
        enrolledCourses: []
      });
    }
    
    // Also fetch UserProgress to get completion info
    const progressRecords = await UserProgress.find({ userId }).lean();
    const progressMap = new Map(progressRecords.map(p => [p.courseId.toString(), p]));
    
    // Combine course data with progress info - filter out deleted courses
    const enrolledCourses = user.enrolledCourses
      .filter(enrollment => enrollment && enrollment.courseId && enrollment.courseId._id) // Properly filter null references
      .map(enrollment => {
        try {
          const courseId = enrollment.courseId._id.toString();
          const progress = progressMap.get(courseId);
          return {
            ...enrollment.courseId.toObject(),
            progress: {
              completedLessons: progress?.completedLessons || [],
              enrolledAt: enrollment.enrolledAt,
              lastAccessed: enrollment.lastAccessed
            }
          };
        } catch (mapErr) {
          console.error('Error mapping enrollment:', mapErr);
          return null;
        }
      })
      .filter(course => course !== null); // Remove any failed mappings
    
    res.json({ 
      success: true,
      enrolledCourses
    });
  } catch (err) {
    console.error("Fetch enrolled courses error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch enrolled courses" 
    });
  }
});

export default router;