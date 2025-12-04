import mongoose from "mongoose";
import Post from "../models/Post.js";
import fetch from "node-fetch"; // If using Node <18

async function embedTextWithEden(text) {
  try {
    const response = await fetch("https://api.edenai.run/v2/ai/embedding", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.EDENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providers: "openai", // or "cohere" | "google" | "mistral"
        text: text,
        model: "text-embedding-3-large", // same model you want
      }),
    });

    const data = await response.json();

    if (!data.openai || !data.openai.embedding) {
      throw new Error("Eden AI returned no embedding");
    }

    return data.openai.embedding; // vector array
  } catch (error) {
    console.error("❌ Eden AI embedding error:", error.message);
    return null;
  }
}

async function embedAll() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const posts = await Post.find();

    for (const post of posts) {
      try {
        if (post.embedding && post.embedding.length > 0) {
          console.log(`⚡ Skipping "${post.title}" (already embedded)`);
          continue;
        }

        const text = `${post.title}\n\n${post.content}`;

        const embeddingVector = await embedTextWithEden(text);

        if (!embeddingVector) {
          console.error(`❌ Failed to embed "${post.title}" (no vector returned)`);
          continue;
        }

        post.embedding = embeddingVector;
        await post.save();

        console.log(`✅ Embedded: "${post.title}"`);
      } catch (postError) {
        console.error(`❌ Failed to embed "${post.title}":`, postError.message);
      }
    }
  } catch (err) {
    console.error("❌ Error connecting to MongoDB or fetching posts:", err.message);
  } finally {
    mongoose.connection.close();
    console.log("🔒 MongoDB connection closed");
    process.exit();
  }
}

embedAll();
