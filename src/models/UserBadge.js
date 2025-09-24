import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const UserBadge = sequelize.define(
  "UserBadge",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    badgeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "badges",
        key: "id",
      },
    },
    earnedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    maxProgress: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    isEarned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "user_badges",
    timestamps: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["badgeId"],
      },
      {
        fields: ["isEarned"],
      },
      {
        unique: true,
        fields: ["userId", "badgeId"],
      },
    ],
  }
);

export default UserBadge;
