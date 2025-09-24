import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Media = sequelize.define(
  "Media",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: [1, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("video", "podcast", "document"),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM(
        "Networking",
        "Technology",
        "Business",
        "Leadership",
        "Innovation",
        "Career Development"
      ),
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    speakers: {
      type: DataTypes.ARRAY(DataTypes.TEXT), // PostgreSQL array of text
      defaultValue: [],
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT), // PostgreSQL array of text
      defaultValue: [],
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    saves: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    shares: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    uploaderId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    fileSize: {
      type: DataTypes.INTEGER, // Use BIGINT for file sizes
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    tableName: "media",
    timestamps: true,
    indexes: [
      {
        fields: ["type"],
      },
      {
        fields: ["category"],
      },
      {
        fields: ["uploaderId"],
      },
      {
        fields: ["isPublic"],
      },
      {
        fields: ["isFeatured"],
      },
      {
        fields: ["tags"],
        using: "gin",
      },
    ],
  }
);

export default Media;
