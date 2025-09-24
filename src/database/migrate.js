import dotenv from "dotenv";
import { logger } from "../utils/logger.js";

// Load environment variables first
dotenv.config();

// Import database connection after environment variables are loaded
import { sequelize } from "./connection.js";

async function migrate() {
  try {
    logger.info("Starting PostgreSQL database migration...");

    // Test connection first
    await sequelize.authenticate();
    logger.info("Database connection established successfully");

    // Enable PostgreSQL extensions
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "citext";');
    logger.info("PostgreSQL extensions enabled");

    // Import models after connection is established
    await import("../models/index.js");
    logger.info("Models imported successfully");

    // Sync all models with PostgreSQL optimizations
    logger.info("Starting model synchronization...");
    await sequelize.sync({
      force: false,
      alter: true,
    });
    logger.info("Model synchronization completed");

    // Create additional PostgreSQL-specific indexes
    await createPostgreSQLIndexes();

    logger.info("PostgreSQL database migration completed successfully");
    process.exit(0);
  } catch (error) {
    logger.error("Database migration failed:", error);
    process.exit(1);
  }
}

async function createPostgreSQLIndexes() {
  try {
    // Create GIN indexes for JSONB columns
    await sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_notification_settings_gin 
      ON users USING GIN (notification_settings);
    `);

    await sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_privacy_settings_gin 
      ON users USING GIN (privacy_settings);
    `);

    await sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_preferences_gin 
      ON users USING GIN (preferences);
    `);

    // Create partial indexes for better performance
    await sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_active_public 
      ON posts (created_at DESC) 
      WHERE is_deleted = false AND is_public = true;
    `);

    await sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_active 
      ON messages (created_at DESC) 
      WHERE is_deleted = false;
    `);

    await sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread 
      ON notifications (created_at DESC) 
      WHERE is_read = false AND is_deleted = false;
    `);

    logger.info("PostgreSQL-specific indexes created successfully");
  } catch (error) {
    logger.warn("Some PostgreSQL indexes could not be created:", error.message);
  }
}

migrate();
