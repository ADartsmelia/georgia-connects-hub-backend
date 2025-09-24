import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const OTP = sequelize.define(
  "OTP",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    email: {
      type: DataTypes.STRING, // Case-insensitive text for PostgreSQL
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    otp: {
      type: DataTypes.TEXT, // Use TEXT for hashed OTP value
      allowNull: false,
      comment: "Hashed OTP value",
    },
    purpose: {
      type: DataTypes.ENUM(
        "verification",
        "login",
        "password_reset",
        "phone_verification",
        "two_factor",
        "account_recovery",
        "registration"
      ),
      allowNull: false,
      defaultValue: "verification",
    },
    additionalData: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Additional data stored with OTP (e.g., registration data)",
    },
    isUsed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    attempts: {
      type: DataTypes.INTEGER, // PostgreSQL optimized integer
      defaultValue: 0,
      validate: {
        max: 3,
        min: 0,
      },
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "otps",
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ["email", "purpose"],
      },
      {
        fields: ["phoneNumber", "purpose"],
      },
      {
        fields: ["userId", "purpose"],
      },
      {
        fields: ["expiresAt"],
      },
      {
        fields: ["isUsed", "expiresAt"],
      },
    ],
  }
);

export default OTP;
