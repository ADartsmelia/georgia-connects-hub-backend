#!/usr/bin/env node

import {
  testSpacesConnection,
  uploadQRCodeToSpaces,
} from "./src/utils/spaces.js";
import QRCode from "qrcode";
import dotenv from "dotenv";

dotenv.config();

async function testSpacesSetup() {
  try {
    console.log("🧪 Testing DigitalOcean Spaces setup...");

    // Test connection
    const connectionTest = await testSpacesConnection();
    if (!connectionTest) {
      console.log("❌ Connection test failed");
      return;
    }

    // Generate test QR code
    console.log("📱 Generating test QR code...");
    const testCode = "test-qr-code-123";
    const qrCodeBuffer = await QRCode.toBuffer(testCode, {
      type: "png",
      width: 200,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Upload to Spaces
    console.log("☁️  Uploading QR code to Spaces...");
    const publicUrl = await uploadQRCodeToSpaces(qrCodeBuffer, testCode);

    console.log("🎉 Test successful!");
    console.log(`📎 QR code URL: ${publicUrl}`);
    console.log("✅ You can now use Spaces for QR code storage");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

testSpacesSetup();
