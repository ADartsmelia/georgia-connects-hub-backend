import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Connection = sequelize.define(
  "Connection",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    requesterId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    addresseeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "rejected", "blocked"),
      defaultValue: "pending",
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: [0, 500],
      },
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "connections",
    timestamps: true,
    indexes: [
      {
        fields: ["requesterId"],
      },
      {
        fields: ["addresseeId"],
      },
      {
        fields: ["status"],
      },
      {
        unique: true,
        fields: ["requesterId", "addresseeId"],
      },
    ],
  }
);

export default Connection;
