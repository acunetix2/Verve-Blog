/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// -------- SESSION SUB-SCHEMA --------
const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true },
    device: String,
    browser: String,
    ipAddress: String,
    location: String,
    lastActive: { type: Date, default: Date.now },
    isCurrent: { type: Boolean, default: false },
  },
  { _id: false }
);

// -------- USER SCHEMA --------
const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, default: null },

	authProvider: {
	  type: String,
	  enum: ["local", "google"],
	  default: "local",
	},
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
	name: {
      type: String,
      required: true,
      trim: true,
      default: "", // optional default
    },

    firstName: {
      type: String,
      default: "",
    },

    lastName: {
      type: String,
      default: "",
    },

    profileImage: {
      type: String,
      default: "",
    },

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    phoneNumber: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      default: "",
    },

    professionalTitle: {
      type: String,
      default: "",
    },

    company: {
      type: String,
      default: "",
    },

    socialLinks: {
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
      github: { type: String, default: "" },
    },

    // -------- COURSE LEARNING TRACKING --------
    enrolledCourses: [
      {
        courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
        enrolledAt: { type: Date, default: Date.now },
        lastAccessed: Date,
      }
    ],

    completedCourses: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }
    ],

    totalLearningMinutes: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    maxStreak: { type: Number, default: 0 },
    lastActivityDate: { type: Date, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },

	// -------- EMAIL VERIFICATION --------
	emailVerified: {
	  type: Boolean,
	  default: false,
	},

	emailVerificationToken: {
	  type: String,
	  select: false,
	},

	emailVerificationExpires: {
	  type: Date,
	},

    // -------- PREFERENCES --------
    preferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: true },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "Africa/Nairobi" },
      theme: { type: String, enum: ["light", "dark"], default: "dark" },
    },

    // -------- SESSIONS --------
    sessions: [sessionSchema],
  },
  { timestamps: true }
);

// -------- PASSWORD HOOK --------
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// -------- PASSWORD COMPARE --------
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.Users || mongoose.model("Users", userSchema);
