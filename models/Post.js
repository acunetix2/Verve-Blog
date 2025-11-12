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

    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    comments: [
      {
        user: { type: String },
        text: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],

    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// Auto-generate slug from title
postSchema.pre("save", function (next) {
  if (this.isModified("title")) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

// Safely add like
postSchema.methods.addLike = async function (userId) {
  if (!this.likedBy.includes(userId)) {
    this.likedBy.push(userId);
    this.likes = this.likedBy.length;
    await this.save();
    return true; // liked successfully
  }
  return false; // already liked
};

// Safely add view
postSchema.methods.addView = async function (userId) {
  if (!this.viewedBy.includes(userId)) {
    this.viewedBy.push(userId);
    this.views = this.viewedBy.length;
    await this.save();
    return true; // view counted
  }
  return false; // already viewed
};

export default mongoose.model("Post", postSchema);
