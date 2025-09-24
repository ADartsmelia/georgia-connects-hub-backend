import { Sequelize } from "sequelize";
import { logger } from "../utils/logger.js";

// Database configuration
const config = {
  development: {
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME || "georgia_connects_hub_dev",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5433,
    dialect: "postgres",
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      // PostgreSQL specific options
      useUTC: false,
      dateStrings: true,
      typeCast: true,
    },
  },
  test: {
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "password",
    database: process.env.DB_NAME + "_test" || "georgia_connects_hub_test",
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5433,
    dialect: "postgres",
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      useUTC: false,
      dateStrings: true,
      typeCast: true,
    },
  },
  production: {
    use_env_variable: "DATABASE_URL",
    dialect: "postgres",
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      useUTC: false,
      dateStrings: true,
      typeCast: true,
    },
    ssl: true,
  },
};

const env = process.env.NODE_ENV || "development";
let dbConfig = config[env];

// For production, parse DATABASE_URL and use individual parameters
if (env === "production" && process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  dbConfig = {
    host: url.hostname,
    port: url.port,
    database: url.pathname.slice(1),
    username: url.username,
    password: url.password,
    dialect: "postgres",
    logging: false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
      useUTC: false,
      dateStrings: true,
      typeCast: true,
    },
    ssl: true,
  };
}

// Create Sequelize instance using environment-specific config
export const sequelize = new Sequelize(dbConfig);

export default sequelize;
