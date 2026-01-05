/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import crypto from "crypto";

export const generateVerificationToken = () => {
  const token = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hashed };
};
