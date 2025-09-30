import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const QRCode = sequelize.define(
  "QRCode",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "Unique QR code string",
    },
    passType: {
      type: DataTypes.ENUM("day_pass", "full_pass"),
      allowNull: false,
      defaultValue: "day_pass",
      comment: "Type of pass - day or full event",
      field: "pass_type",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Associated user ID (optional)",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    status: {
      type: DataTypes.ENUM("active", "used", "expired"),
      defaultValue: "active",
      allowNull: false,
      comment: "QR code status",
    },
    scannedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Timestamp when QR code was scanned",
    },
    scannedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Admin user who scanned the QR code",
      references: {
        model: "users",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional metadata (IP, device info, etc.)",
    },
  },
  {
    tableName: "qr_codes",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["code"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["pass_type"],
      },
      {
        fields: ["createdAt"],
      },
    ],
  }
);

export default QRCode;
