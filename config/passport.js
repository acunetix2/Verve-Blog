/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        // 1️⃣ First: find by Google ID
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
          return done(null, user);
        }

        // 2️⃣ Second: check if a user exists with the same email
        user = await User.findOne({ email });
        if (user) {
          // Link Google to user to avoid duplicate key error
          user.googleId = profile.id;
          user.avatar = profile.photos[0]?.value;
          user.name = user.name || profile.displayName;
          user.emailVerified = true; // ✅ Mark email as verified for Google users
          await user.save();

          return done(null, user);
        }

        // 3️⃣ Third: create a new Google user if none found
        const newUser = await User.create({
          googleId: profile.id,
          email,
          name: profile.displayName,
          avatar: profile.photos[0]?.value,
          emailVerified: true, // ✅ Mark email as verified for new Google users
          role: "user",
        });

        return done(null, newUser);
      } catch (err) {
        console.error("Google OAuth Error:", err);
        return done(err, null);
      }
    }
  )
);

// 🔐 Serialize & Deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((u) => done(null, u))
    .catch((err) => done(err, null));
});

export default passport;
