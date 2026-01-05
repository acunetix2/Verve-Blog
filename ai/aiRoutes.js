/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import express from "express";
import Post from "../models/Post.js";
import fetch from "node-fetch";

const router = express.Router();

const SYSTEM_PROMPT = `
You are Verve Assistant, similar to TryHackMe Echo.
Give hints, not full answers.
Always be context-aware and cybersecurity-focused.
`;

// ----------------------
//  EDEN AI ENDPOINTS
// ----------------------
const EDEN_CHAT = "https://api.edenai.run/v2/text/chat";
const EDEN_EMBED = "https://api.edenai.run/v2/ai/embedding";

//
// ----------------------
//  EMBEDDING FUNCTION
// ----------------------
async function createEmbedding(text) {
  try {
    const response = await fetch(EDEN_EMBED, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EDENAI_API_KEY}`,
      },
      body: JSON.stringify({
        providers: ["openai_chat"],
        text: text,
      }),
    });

    const data = await response.json();
    console.log("Eden-Embedding Response:", data);

    if (!data.openai?.embedding) {
      throw new Error("No embedding returned");
    }

    return data.openai.embedding;
  } catch (err) {
    console.error("Embedding error:", err);
    return null;
  }
}

//
// ----------------------
//  CHAT FUNCTION
// ----------------------
async function callEdenChat(message, context) {
  try {
    const prompt = `${SYSTEM_PROMPT}\nContext:\n${context}\nUser: ${message}`;

    const response = await fetch(EDEN_CHAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EDENAI_API_KEY}`,
      },
      body: JSON.stringify({
        providers: ["openai"],
        text: prompt,
      }),
    });

    const data = await response.json();
    console.log("Eden-Chat Raw Response:", data);

    return data;
  } catch (err) {
    console.error("Chat error:", err);
    return { error: err.message };
  }
}

//
// ----------------------
//  NEW: /embed route
// ----------------------
router.post("/embed", async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: "Missing text" });

  const embedding = await createEmbedding(text);

  if (!embedding) {
    return res.status(500).json({ error: "Failed to generate embedding" });
  }

  res.json({ embedding });
});

//
// ----------------------
//  CHAT ROUTE
// ----------------------
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "Hmm, I didn't quite catch that. Could you ask again? 🤔",
      });
    }

    // Pull 3 posts as context
    const posts = await Post.find().limit(3);
    const context = posts.length
      ? posts.map((p) => `${p.title}\n${p.content}`).join("\n\n")
      : "No relevant posts found.";

    const truncatedContext = context.substring(0, 1500);

    // Call Eden AI chat
    let data = await callEdenChat(message, truncatedContext);

    // retry once
    if ((!data?.openai?.message || !data.openai.message.length) && !data?.error) {
      data = await callEdenChat(message, truncatedContext);
    }

    let reply = "Hmm, I couldn’t generate a response. Try rephrasing? 🤔";

    if (data?.openai?.message?.length > 0) {
      reply = data.openai.message[0].content;
    }

    res.json({ reply });
  } catch (error) {
    console.error("AI ROUTE ERROR:", error);
    res.status(500).json({
      reply: "Oops! Something went wrong. Try again soon! 🔧",
    });
  }
});

export default router;
