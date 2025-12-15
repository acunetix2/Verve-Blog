import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected"))
.catch(err => console.error(err));

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema, "users");

async function addEmailVerified() {
  try {
    const result = await User.updateMany(
      { emailVerified: { $exists: false } },
      { $set: { emailVerified: false } }
    );
    console.log(`Updated ${result.modifiedCount} users`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

addEmailVerified();
