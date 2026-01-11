import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      default: null,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      minlength: 6,
      select: false, // ❗ important: prevents password from being returned in queries
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "admin",
    },

    // ⭐ SAFE IMAGE FIELD
    profileImage: {
      type: String,
      default: "",
      trim: true,
    },

    // Profile enhancements
    name: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
      maxlength: 500,
    },

    location: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    github: {
      type: String,
      default: "",
    },

    linkedin: {
      type: String,
      default: "",
    },

    twitter: {
      type: String,
      default: "",
    },

    // Statistics
    totalPosts: {
      type: Number,
      default: 0,
    },

    totalViews: {
      type: Number,
      default: 0,
    },

    totalLikes: {
      type: Number,
      default: 0,
    },

    // Badges array
    badges: [
      {
        id: String,
        name: String,
        description: String,
        icon: String,
        unlockedDate: Date,
        color: String,
      },
    ],

    // Achievements array
    achievements: [
      {
        id: String,
        title: String,
        description: String,
        progress: Number,
        maxProgress: Number,
        icon: String,
        completed: Boolean,
      },
    ],

    // Contribution stats
    stats: {
      postsPublished: { type: Number, default: 0 },
      articlesRead: { type: Number, default: 0 },
      resourcesShared: { type: Number, default: 0 },
      communitiesJoined: { type: Number, default: 0 },
    },

    // Theme settings
    themeSettings: {
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      contrast: { type: String, enum: ["normal", "high"], default: "normal" },
      fontSize: { type: Number, default: 100, min: 80, max: 150 },
      useSystemFont: { type: Boolean, default: false },
      animationReduces: { type: Boolean, default: false },
    },

    // Email notifications settings
    notificationSettings: {
      emailNotifications: { type: Boolean, default: true },
      newPostNotifications: { type: Boolean, default: true },
      likeNotifications: { type: Boolean, default: true },
      commentNotifications: { type: Boolean, default: true },
      shareNotifications: { type: Boolean, default: true },
    },

    // Enrolled courses
    enrolledCourses: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        enrolledAt: { type: Date, default: Date.now },
        lastAccessed: Date,
      }
    ],
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
);

// 🔒 Hash password before saving (only if modified)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 🔐 Compare password during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// 🚫 Prevent OverwriteModelError in Next.js / hot reload
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
