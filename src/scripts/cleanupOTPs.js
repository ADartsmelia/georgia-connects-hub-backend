#!/usr/bin/env node

/**
 * OTP Cleanup Script
 *
 * This script cleans up expired OTPs from the database.
 * Can be run manually or scheduled as a cron job.
 */

import dotenv from "dotenv";
import { sequelize } from "../database/connection.js";
import OTPService from "../utils/otpService.js";
import { logger } from "../utils/logger.js";

// Load environment variables
dotenv.config();

async function cleanupExpiredOTPs() {
  try {
    logger.info("Starting OTP cleanup process...");

    // Test database connection
    await sequelize.authenticate();
    logger.info("Database connection established");

    // Clean up expired OTPs
    const cleanedCount = await OTPService.cleanupExpiredOTPs();

    logger.info(
      `OTP cleanup completed successfully. Cleaned up ${cleanedCount} expired OTPs`
    );

    process.exit(0);
  } catch (error) {
    logger.error("Error during OTP cleanup:", error);
    process.exit(1);
  }
}

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupExpiredOTPs();
}

export default cleanupExpiredOTPs;
