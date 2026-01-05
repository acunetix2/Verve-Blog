/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import { S3Client } from "@aws-sdk/client-s3";

const b2Client = new S3Client({
  region: "us-east-005", // B2 region (check your bucket info)
  endpoint: "https://s3.us-east-005.backblazeb2.com", // S3-compatible endpoint
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
});

export default b2Client;
