#!/usr/bin/env node

const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config({ path: "./.env" });

// Database connection configuration
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  dialect: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  logging: false,
});

async function clearQRCodes() {
  try {
    console.log("🔗 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connection established");

    // Check current QR codes count
    const [qrCount] = await sequelize.query(
      "SELECT COUNT(*) as count FROM qr_codes"
    );
    console.log(`📊 Current QR codes in database: ${qrCount[0].count}`);

    // Clear all QR codes
    console.log("🗑️  Clearing all QR codes...");
    const [result] = await sequelize.query("DELETE FROM qr_codes");
    console.log(`✅ Deleted ${result} QR codes`);

    // Verify deletion
    const [finalCount] = await sequelize.query(
      "SELECT COUNT(*) as count FROM qr_codes"
    );
    console.log(`📊 Remaining QR codes: ${finalCount[0].count}`);

    console.log("🎉 QR codes table cleared successfully!");
  } catch (error) {
    console.error("❌ Error clearing QR codes:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("🔌 Database connection closed");
  }
}

// Add 5-second delay for cancellation
console.log("⚠️  This will delete ALL QR codes from the database!");
console.log("⏰ Starting in 5 seconds... Press Ctrl+C to cancel");
setTimeout(() => {
  clearQRCodes();
}, 5000);
