import mongoose from "mongoose";

const EmailDigestSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly",
    },
    subscribed: {
      type: Boolean,
      default: true,
    },
    categories: [String],
    lastDigestSent: {
      type: Date,
      default: null,
    },
    nextDigestDate: {
      type: Date,
      default: null,
    },
    email: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("EmailDigestSubscription", EmailDigestSubscriptionSchema);
