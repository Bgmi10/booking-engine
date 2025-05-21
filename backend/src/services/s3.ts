import { s3 } from "../config/s3";
import dotenv from "dotenv";

dotenv.config();

export async function deleteImagefromS3(url: string) {
  const bucketName = process.env.S3_BUCKET_NAME!;
  const key = url.split(".com/")[1];
  await s3.deleteObject({ Bucket: bucketName, Key: key }).promise();
}


