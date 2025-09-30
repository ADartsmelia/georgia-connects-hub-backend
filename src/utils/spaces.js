import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

// DigitalOcean Spaces configuration (S3-compatible)
const s3Client = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  },
  forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style URLs
});

/**
 * Upload QR code image to DigitalOcean Spaces
 * @param {Buffer} qrCodeBuffer - QR code image buffer
 * @param {string} qrCode - QR code string for filename
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export async function uploadQRCodeToSpaces(qrCodeBuffer, qrCode) {
  try {
    const key = `qr-codes/${qrCode}.png`;

    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
      Body: qrCodeBuffer,
      ContentType: "image/png",
      ACL: "public-read", // Make image publicly accessible
      CacheControl: "max-age=31536000", // Cache for 1 year
    });

    await s3Client.send(command);

    // Return public URL
    const publicUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${key}`;
    console.log(`✅ QR code uploaded to Spaces: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error("❌ Error uploading QR code to Spaces:", error);
    throw error;
  }
}

/**
 * Delete QR code image from DigitalOcean Spaces
 * @param {string} qrCode - QR code string for filename
 * @returns {Promise<void>}
 */
export async function deleteQRCodeFromSpaces(qrCode) {
  try {
    const key = `qr-codes/${qrCode}.png`;

    const command = new DeleteObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`✅ QR code deleted from Spaces: ${key}`);
  } catch (error) {
    console.error("❌ Error deleting QR code from Spaces:", error);
    throw error;
  }
}

/**
 * Test Spaces connection
 * @returns {Promise<boolean>}
 */
export async function testSpacesConnection() {
  try {
    // Try to upload a small test file
    const testBuffer = Buffer.from("test");
    const testKey = `test/connection-test-${Date.now()}.txt`;

    const command = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: testKey,
      Body: testBuffer,
      ContentType: "text/plain",
      ACL: "public-read",
    });

    await s3Client.send(command);

    // Clean up test file
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: testKey,
    });
    await s3Client.send(deleteCommand);

    console.log("✅ DigitalOcean Spaces connection successful");
    return true;
  } catch (error) {
    console.error("❌ DigitalOcean Spaces connection failed:", error);
    return false;
  }
}
