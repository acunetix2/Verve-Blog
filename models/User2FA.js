import mongoose from "mongoose";

const user2FASchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  secret: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  backupCodes: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("User2FA", user2FASchema);
