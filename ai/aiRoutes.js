/**
 * AI Routes using OpenRouter API
 * Requires authentication
 */
import express from "express";
import Post from "../models/Post.js";
import { authMiddleware } from "../middleware/auth.js";
import fetch from "node-fetch";

const router = express.Router();

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

const SYSTEM_PROMPT = `You are Verve Assistant, an AI guide for the Verve cybersecurity learning platform.
You provide helpful guidance on cybersecurity topics, learning paths, and technical concepts.
Give hints and explanations, not full exploit code.
Be context-aware and helpful for learners.
Keep responses concise and focused.
If asked about non-cybersecurity topics, politely redirect to cybersecurity learning.`;

/**
 * POST /api/ai/chat
 * Send a message to the AI assistant
 * Requires authentication
 */
router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?._id;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "Please provide a valid message. 🤔",
      });
    }

    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured");
      return res.status(500).json({
        reply: "AI service is not properly configured. Please try again later. 🔧",
      });
    }

    // Get recent posts as context (up to 2000 characters)
    let context = "";
    try {
      const posts = await Post.find().select("title description content tags").limit(5).exec();
      if (posts.length > 0) {
        context = posts
          .map((p) => `Title: ${p.title}\nTags: ${p.tags?.join(", ") || "N/A"}\nContent: ${p.description || p.content?.substring(0, 200)}`)
          .join("\n\n");
        context = context.substring(0, 2000);
      }
    } catch (err) {
      console.warn("Failed to fetch context posts:", err.message);
    }

    const userPrompt = context
      ? `Platform Context:\n${context}\n\nUser Question: ${message}`
      : `User Question: ${message}`;

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.APP_URL || "https://vervehub.netlify.app",
          "X-Title": "Verve Platform",
        },
        body: JSON.stringify({
          model: "openchat/openchat-7b",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenRouter API error:", errorData);
        throw new Error(errorData.error?.message || "OpenRouter API error");
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try rephrasing. 🤔";

      res.json({ reply });
    } catch (apiError) {
      console.error("AI API Error:", apiError.message);
      
      // Fallback response
      if (apiError.message.includes("rate_limit")) {
        return res.status(429).json({
          reply: "I'm handling too many requests right now. Please try again in a moment! ⏳",
        });
      }

      res.status(500).json({
        reply: "I'm having trouble right now. Please try again in a moment. 🔌",
      });
    }
  } catch (error) {
    console.error("AI ROUTE ERROR:", error);
    res.status(500).json({
      reply: "Something went wrong. Please try again! 🔧",
    });
  }
});

/**
 * POST /api/ai/embed
 * Generate embeddings for text
 * Requires authentication
 */
router.post("/embed", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        error: "Embedding service not available",
      });
    }

    // Using a different endpoint for embeddings if available
    // For now, we'll return a simple placeholder
    // OpenRouter doesn't have a dedicated embedding endpoint, 
    // so we recommend using separate embedding service

    res.json({
      error: "Embeddings require a separate service configuration",
      suggestion: "Use a dedicated embedding service like Cohere or OpenAI",
    });
  } catch (error) {
    console.error("Embedding error:", error);
    res.status(500).json({ error: "Failed to generate embedding" });
  }
});

/**
 * GET /api/ai/health
 * Check if AI service is available
 */
router.get("/health", (req, res) => {
  const isConfigured = !!OPENROUTER_API_KEY;
  res.json({
    status: isConfigured ? "healthy" : "unconfigured",
    provider: "OpenRouter",
    configured: isConfigured,
  });
});

export default router;
