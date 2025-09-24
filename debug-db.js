import dotenv from "dotenv";

// Load environment variables first
dotenv.config();

console.log("Environment variables:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);
console.log("NODE_ENV:", process.env.NODE_ENV);

// Now import and test the connection
import { sequelize } from "./src/database/connection.js";

try {
  await sequelize.authenticate();
  console.log("✅ Database connection successful!");
} catch (error) {
  console.log("❌ Database connection failed:", error.message);
}
