import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Badge = sequelize.define(
  "Badge",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    icon: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM("Networking", "Knowledge", "Engagement", "Special"),
      allowNull: false,
    },
    rarity: {
      type: DataTypes.ENUM("Common", "Rare", "Epic", "Legendary"),
      defaultValue: "Common",
    },
    requirements: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    tableName: "badges",
    timestamps: true,
    indexes: [
      {
        fields: ["category"],
      },
      {
        fields: ["rarity"],
      },
      {
        fields: ["isActive"],
      },
    ],
  }
);

export default Badge;
