import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  fileData: {
    type: Buffer, // stores binary data
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Document", documentSchema);
