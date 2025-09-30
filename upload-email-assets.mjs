#!/usr/bin/env node

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// DigitalOcean Spaces configuration
const s3Client = new S3Client({
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
  },
  forcePathStyle: false,
});

async function uploadEmailAssets() {
  try {
    console.log("📤 Uploading email assets to DigitalOcean Spaces...");

    // Upload banner
    const bannerPath = path.join("email-assets", "banner.png");
    if (fs.existsSync(bannerPath)) {
      const bannerBuffer = fs.readFileSync(bannerPath);
      const bannerCommand = new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: "email-assets/banner.png",
        Body: bannerBuffer,
        ContentType: "image/png",
        ACL: "public-read",
        CacheControl: "max-age=31536000", // Cache for 1 year
      });

      await s3Client.send(bannerCommand);
      const bannerUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/email-assets/banner.png`;
      console.log(`✅ Banner uploaded: ${bannerUrl}`);
    } else {
      console.log("❌ Banner file not found:", bannerPath);
    }

    // Upload logo
    const logoPath = path.join("email-assets", "logo.png");
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoCommand = new PutObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: "email-assets/logo.png",
        Body: logoBuffer,
        ContentType: "image/png",
        ACL: "public-read",
        CacheControl: "max-age=31536000", // Cache for 1 year
      });

      await s3Client.send(logoCommand);
      const logoUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/email-assets/logo.png`;
      console.log(`✅ Logo uploaded: ${logoUrl}`);
    } else {
      console.log("❌ Logo file not found:", logoPath);
    }

    console.log("🎉 Email assets upload complete!");
  } catch (error) {
    console.error("❌ Error uploading email assets:", error);
    process.exit(1);
  }
}

uploadEmailAssets();
