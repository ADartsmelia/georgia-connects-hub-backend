import dotenv from "dotenv";
import { Sequelize } from "sequelize";

// Load environment variables first
dotenv.config();

console.log("Environment variables:");
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);

// Create a simple Sequelize instance
const sequelize = new Sequelize({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: "postgres",
  logging: console.log,
});

try {
  await sequelize.authenticate();
  console.log("✅ Sequelize connection successful!");
} catch (error) {
  console.log("❌ Sequelize connection failed:", error.message);
}
