import dotenv from "dotenv";
import { Sequelize } from "sequelize";

// Load environment variables first
dotenv.config();

console.log("🗑️  Starting user database cleanup...");

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

async function clearUsers() {
  try {
    // Test connection first
    await sequelize.authenticate();
    console.log("✅ Database connection established successfully");

    // Import models after connection is established
    const {
      User,
      Post,
      Comment,
      Connection,
      Team,
      TeamMember,
      Chat,
      Message,
      ChatMember,
      Sponsor,
      Offer,
      Media,
      Quiz,
      QuizAttempt,
      Badge,
      UserBadge,
      Contest,
      ContestEntry,
      Playlist,
      Notification,
      OTP,
    } = await import("./src/models/index.js");
    console.log("✅ Models imported successfully");

    // Clear data in the correct order to respect foreign key constraints
    console.log("🧹 Clearing user-related data...");

    // Clear user-related data first (child tables)
    await Promise.all([
      sequelize.query('DELETE FROM "user_badges"'),
      sequelize.query('DELETE FROM "quiz_attempts"'),
      sequelize.query('DELETE FROM "notifications"'),
      sequelize.query('DELETE FROM "otps"'),
      sequelize.query('DELETE FROM "chat_members"'),
      sequelize.query('DELETE FROM "team_members"'),
      sequelize.query('DELETE FROM "contest_entries"'),
    ]);
    console.log("✅ Cleared user-related child tables");

    // Clear main tables
    await Promise.all([
      sequelize.query('DELETE FROM "comments"'),
      sequelize.query('DELETE FROM "messages"'),
      sequelize.query('DELETE FROM "posts"'),
      sequelize.query('DELETE FROM "connections"'),
      sequelize.query('DELETE FROM "chats"'),
      sequelize.query('DELETE FROM "teams"'),
      sequelize.query('DELETE FROM "contests"'),
      sequelize.query('DELETE FROM "offers"'),
      sequelize.query('DELETE FROM "media"'),
      sequelize.query('DELETE FROM "quizzes"'),
      sequelize.query('DELETE FROM "badges"'),
      sequelize.query('DELETE FROM "sponsors"'),
      sequelize.query('DELETE FROM "playlist"'),
    ]);
    console.log("✅ Cleared main tables");

    // Finally, clear users
    await sequelize.query('DELETE FROM "users"');
    console.log("✅ Cleared users table");

    // Reset auto-increment sequences (if any)
    await sequelize.query(
      'ALTER SEQUENCE IF EXISTS "Users_id_seq" RESTART WITH 1'
    );
    console.log("✅ Reset sequences");

    console.log("🎉 User database cleanup completed successfully!");
    console.log("📊 All user data has been removed from the database.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database cleanup failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

clearUsers();
