import express from "express";
import multer from "multer";
import Document from "../models/documents.js";

const router = express.Router();

// Use memory storage so files go into MongoDB, not disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * @route POST /api/documents
 * @desc Upload a new document
 */
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { title, description } = req.body;

    const newDocument = new Document({
      title,
      description,
      fileData: req.file.buffer,
      fileType: req.file.mimetype,
      fileName: req.file.originalname,
    });

    await newDocument.save();
    res.status(201).json({ message: "Document uploaded successfully", id: newDocument._id });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
});

/**
 * @route GET /api/documents
 * @desc Get all uploaded documents (without file data)
 */
router.get("/", async (req, res) => {
  try {
    // Select all documents but exclude the actual file data
    const documents = await Document.find().select("-fileData");
    res.status(200).json(documents);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch documents", error: error.message });
  }
});

/**
 * @route GET /api/documents/:id
 * @desc Download a specific document by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "File not found" });

    res.set({
      "Content-Type": doc.fileType,
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
    });
    res.send(doc.fileData);
  } catch (error) {
    res.status(500).json({ message: "Download failed", error: error.message });
  }
});

export default router;
