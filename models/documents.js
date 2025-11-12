import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  b2FileId: { type: String, required: true }, // store B2 fileId for private access
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model("Document", documentSchema);
