/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
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

    // ✅ Changed from single string to array of tech categories
    categories: { type: [String], default: ["Uncategorized"] },
    // Keep legacy category field for backwards compatibility
    category: { type: String, default: "Uncategorized" },

    likes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    comments: [
      {
        _id: String,
        author: {
          _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          name: String,
          profileImage: String,
        },
        content: String,
        likes: { type: Number, default: 0 },
        isLiked: { type: Boolean, default: false },
        replies: [
          {
            _id: String,
            author: {
              _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
              name: String,
              profileImage: String,
            },
            content: String,
            likes: { type: Number, default: 0 },
            isLiked: { type: Boolean, default: false },
            replies: { type: Array, default: [] },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now },
          },
        ],
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // Reviews
    reviews: [
      {
        _id: String,
        author: {
          _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          name: String,
          profileImage: String,
        },
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
        helpful: { type: Number, default: 0 },
        unhelpful: { type: Number, default: 0 },
        userVote: String,
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    // Reactions
    reactions: {
      like: { count: { type: Number, default: 0 } },
      love: { count: { type: Number, default: 0 } },
      useful: { count: { type: Number, default: 0 } },
    },

    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    embedding: { type: [Number], index: "vector", default: [] },

    // Analytics fields
    totalEngagements: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    
    // SEO fields
    seoTitle: { type: String },
    seoDescription: { type: String },
    
    // Media
    thumbnail: { type: String },
    
    // Author reference for better queries
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Series/Collections field
    series: { type: mongoose.Schema.Types.ObjectId, ref: "Series", default: null },
    seriesOrder: { type: Number, default: 0 },

    // Post Scheduling
    status: { type: String, enum: ["draft", "published", "scheduled"], default: "draft" },
    publishedAt: { type: Date, default: null },
    scheduledAt: { type: Date, default: null },
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
