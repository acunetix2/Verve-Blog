/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import express from "express";
import multer from "multer";
import Document from "../models/documents.js";
import Notification from "../models/Notification.js"; 
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import User from "../models/Users.js"; 
import { getDownloadHeaders, sanitizeFilename } from "../utils/pdfWatermark.js";

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

    // ✅ Accept both 'categories' (array) and 'category' (legacy string) 
    const { title, description, categories, category } = req.body;
    const uploadedFile = await uploadToB2(req.file);

    // Process categories - support both new array format and legacy single category
    let categoriesArray = [];
    if (categories && Array.isArray(categories)) {
      categoriesArray = categories.filter((cat) => cat && cat.trim());
    } else if (category && typeof category === "string") {
      categoriesArray = [category.trim()];
    }
    
    if (categoriesArray.length === 0) {
      categoriesArray = ["Uncategorized"];
    }

    const newDocument = new Document({
      title,
      description,
      fileName: uploadedFile.fileName,
      fileType: req.file.mimetype,
      b2FileId: uploadedFile.fileName,
      // ✅ Save both for compatibility
      categories: categoriesArray,
      category: categoriesArray[0],
    });

    await newDocument.save();

    // Emit event
    io.emit("new-document", newDocument);

    // ✅ FIXED — Save ONLY ONE global notification
    await Notification.create({
      type: "document",
      title: "New Resource Uploaded",
      message: newDocument.title,
    });

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
 * @desc Download document with VerveHub Academy watermark/branding
 */
router.get("/download/:id", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "File not found" });

    // Fetch document from B2
    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET_NAME,
      Key: doc.b2FileId,
    });

    const s3Response = await s3Client.send(command);
    const bodyContents = await s3Response.Body.transformToByteArray();
    
    // Set response headers with watermark branding
    const headers = getDownloadHeaders(doc.title || doc.b2FileId, doc.fileType);
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    // Add custom headers showing it's a branded VerveHub download
    res.setHeader('X-VerveHub-Branded', 'true');
    res.setHeader('X-Document-Title', sanitizeFilename(doc.title || 'Document'));
    res.setHeader('X-Downloaded-Date', new Date().toISOString());
    
    // Send the file
    res.send(Buffer.from(bodyContents));

  } catch (error) {
    console.error("Download Route Error:", error);
    res.status(500).json({ message: "Failed to generate download", error: error.message });
  }
});

/**
 * @route POST /api/documents/:id/view
 * @desc Track document views for analytics
 */
router.post("/:id/view", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "File not found" });
    
    // Increment view count
    doc.views = (doc.views || 0) + 1;
    await doc.save();
    
    res.status(200).json({ views: doc.views });
  } catch (error) {
    res.status(500).json({ message: "Failed to track view", error: error.message });
  }
});

export default router;
