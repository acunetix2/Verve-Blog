import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  type: { type: String, required: true },      // "document" | "post"
  title: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: Date, default: Date.now },
  // read will now be handled locally per client, not stored in DB
});

export default mongoose.model("Notification", NotificationSchema);
