import mongoose from "mongoose";

const engagementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  liked: {
    type: Boolean,
    default: false,
  },
  bookmarked: {
    type: Boolean,
    default: false,
  },
  shares: {
    twitter: { type: Number, default: 0 },
    linkedin: { type: Number, default: 0 },
    facebook: { type: Number, default: 0 },
    email: { type: Number, default: 0 },
    direct: { type: Number, default: 0 },
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Engagement", engagementSchema);
