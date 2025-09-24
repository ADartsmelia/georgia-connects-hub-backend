import dotenv from "dotenv";
import { Sequelize } from "sequelize";

// Load environment variables first
dotenv.config();

console.log("🚀 Starting PostgreSQL database migration...");

// Create a simple Sequelize instance that works
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: "postgres",
  logging: false,
});

async function migrate() {
  try {
    // Test connection first
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");

    // Enable PostgreSQL extensions
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "citext";');
    console.log("✅ PostgreSQL extensions enabled");

    // Import models after connection is established
    await import("./src/models/index.js");
    console.log("✅ Models imported successfully");

    // Sync all models
    await sequelize.sync({
      force: false,
      alter: true,
    });

    console.log("✅ Database migration completed successfully");
    console.log("🎉 Your PostgreSQL database is ready!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database migration failed:", error.message);
    process.exit(1);
  }
}

migrate();
