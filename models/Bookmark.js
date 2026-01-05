import mongoose from "mongoose";

const bookmarkSchema = new mongoose.Schema({
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
  readingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  totalWords: {
    type: Number,
    default: 0,
  },
  wordsRead: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ["unread", "reading", "completed"],
    default: "unread",
  },
  estimatedTimeLeft: {
    type: Number,
    default: 0,
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
  lastReadAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
});

export default mongoose.model("Bookmark", bookmarkSchema);
