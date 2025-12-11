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
