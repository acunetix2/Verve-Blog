import mongoose from "mongoose";
import slugify from "slugify";

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    content: { type: String, required: true },
    author: { type: String, required: true },
    date: { type: Date, default: Date.now },
    readTime: { type: String, default: "unspecified" },
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    slug: { type: String, unique: true },
  },
  { timestamps: true }
);

// ✅ Automatically generate a slug before saving
postSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

export default mongoose.model("Post", postSchema);
