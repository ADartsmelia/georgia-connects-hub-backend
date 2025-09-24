import { sequelize } from "../database/connection.js";
import { logger } from "../utils/logger.js";

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.DB_NAME = "georgia_connects_hub_test";

// Mock logger for tests
jest.mock("../utils/logger.js", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Setup and teardown for tests
beforeAll(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ force: true });
    logger.info("Test database connected and synced");
  } catch (error) {
    logger.error("Test database setup failed:", error);
    throw error;
  }
});

afterAll(async () => {
  try {
    await sequelize.close();
    logger.info("Test database connection closed");
  } catch (error) {
    logger.error("Test database teardown failed:", error);
  }
});

// Clean up after each test
afterEach(async () => {
  try {
    // Clear all tables
    await sequelize.truncate({ cascade: true });
  } catch (error) {
    logger.error("Test cleanup failed:", error);
  }
});
