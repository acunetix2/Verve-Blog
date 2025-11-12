import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const client = new S3Client({
  region: "us-east-005",
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APP_KEY,
  },
  forcePathStyle: true,
});

(async () => {
  try {
    const result = await client.send(new ListBucketsCommand({}));
    console.log("Buckets:", result.Buckets);
  } catch (err) {
    console.error("B2 Test Error:", err);
  }
})();
