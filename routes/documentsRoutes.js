import express from "express";
import multer from "multer";
import Document from "../models/documents.js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

// ?? Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ?? Initialize S3 client for Backblaze B2
const s3Client = new S3Client({
  region: "us-east-005",
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
  forcePathStyle: true,
});

// ?? Helper: upload file to B2
const uploadToB2 = async (file) => {
  const uniqueFileName = `${Date.now()}-${file.originalname}`;
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: uniqueFileName,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await s3Client.send(command);
    return { fileName: uniqueFileName };
  } catch (error) {
    console.error("B2 Upload Error:", error);
    throw error; // re-throw actual error for debugging
  }
};

/**
 * @route POST /api/documents
 * @desc Upload a new document to B2
 */
router.post("/", upload.single("file"), async (req, res) => {
  const io = req.app.get("io");
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { title, description } = req.body;
    const uploadedFile = await uploadToB2(req.file);

    const newDocument = new Document({
      title,
      description,
      fileName: uploadedFile.fileName,
      fileType: req.file.mimetype,
      b2FileId: uploadedFile.fileName, // store filename for private download
    });

    await newDocument.save();

	io.emit("new-document", newDocument);
    res.status(201).json({
      message: "Document uploaded successfully",
      id: newDocument._id,
    });
  } catch (error) {
    console.error("Upload Route Error:", error);
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

/**
 * @route GET /api/documents
 * @desc Get all uploaded documents (metadata only)
 */
router.get("/", async (req, res) => {
  try {
    const documents = await Document.find().select("-b2FileId");
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
});

/**
 * @route GET /api/documents/:id
 * @desc Get single document metadata
 */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).select("-b2FileId");
    if (!doc) return res.status(404).json({ message: "File not found" });
    res.status(200).json(doc);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch document", error: error.message });
  }
});

/**
 * @route GET /api/documents/download/:id
 * @desc Generate a temporary presigned URL for private B2 files
 */
router.get("/download/:id", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "File not found" });

    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: doc.b2FileId,
    });

    // Generate a presigned URL valid for 1 hour
    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.status(200).json({ downloadUrl });
  } catch (error) {
    console.error("Download Route Error:", error);
    res.status(500).json({ message: "Failed to generate download URL", error: error.message });
  }
});

export default router;