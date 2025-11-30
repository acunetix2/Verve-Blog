import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["document", "post", "system"], 
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Notification", NotificationSchema);
