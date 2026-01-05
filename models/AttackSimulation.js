/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
// backend/models/AttackSimulation.js
import mongoose from "mongoose";

const AttackSimulationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  fileUrl: { type: String, required: true }, // Cloudinary URL
  createdAt: { type: Date, default: Date.now },
});

const AttackSimulation = mongoose.model("AttackSimulation", AttackSimulationSchema);
export default AttackSimulation;
