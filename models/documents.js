/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  b2FileId: { type: String, required: true }, 
  // ✅ Changed from single string to array of tech categories
  categories: { type: [String], default: ["Uncategorized"] },
  // Keep legacy category field for backwards compatibility
  category: { type: String, default: "Uncategorized" },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Document", documentSchema);
