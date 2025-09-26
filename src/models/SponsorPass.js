import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const SponsorPass = sequelize.define(
  "SponsorPass",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sponsorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "sponsors",
        key: "id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    passType: {
      type: DataTypes.ENUM("day_pass", "full_pass"),
      allowNull: false,
    },
    dayNumber: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "For day passes, which day (1, 2, etc.)",
    },
    issuedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    issuedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "sponsor_passes",
    timestamps: true,
    indexes: [
      {
        fields: ["sponsorId"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["passType"],
      },
      {
        fields: ["isActive"],
      },
      {
        unique: true,
        fields: ["sponsorId", "userId", "passType", "dayNumber"],
        name: "unique_sponsor_user_pass",
      },
    ],
  }
);

export default SponsorPass;

