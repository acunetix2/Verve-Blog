/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["document", "post", "course", "system", "alert", "achievement"], 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    // ✅ Advanced notification fields
    priority: { 
      type: String, 
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      default: null // null means global notification
    },
    isRead: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    actionUrl: { type: String, default: null },
    icon: { type: String, default: "bell" },
    backgroundColor: { type: String, default: "bg-blue-500" },
    // Metadata for filtering and tracking
    metadata: {
      relatedId: mongoose.Schema.Types.ObjectId,
      category: String,
      tags: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ isRead: 1, isActive: 1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

export default mongoose.model("Notification", NotificationSchema);
