import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Sponsor = sequelize.define(
  "Sponsor",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: [1, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    website: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
      validate: {
        isUrl: true,
      },
    },
    logo: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        "Coworking",
        "Events",
        "Food & Beverage",
        "Technology",
        "Professional Services",
        "Healthcare",
        "Finance",
        "Education"
      ),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    contactEmail: {
      type: DataTypes.STRING, // Case-insensitive text for PostgreSQL
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    subscriptionType: {
      type: DataTypes.ENUM("basic", "premium", "enterprise"),
      defaultValue: "basic",
    },
    subscriptionExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalOffers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    totalRedemptions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    rating: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5,
      },
    },
    totalRatings: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
  },
  {
    tableName: "sponsors",
    timestamps: true,
    indexes: [
      {
        fields: ["category"],
      },
      {
        fields: ["location"],
      },
      {
        fields: ["isActive"],
      },
      {
        fields: ["isVerified"],
      },
    ],
  }
);

export default Sponsor;
