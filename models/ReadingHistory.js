import mongoose from "mongoose";

const readingHistorySchema = new mongoose.Schema({
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
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  timeSpent: {
    type: Number,
    default: 0,
  },
  readAt: {
    type: Date,
    default: Date.now,
  },
});

readingHistorySchema.index({ userId: 1, readAt: -1 });

export default mongoose.model("ReadingHistory", readingHistorySchema);
