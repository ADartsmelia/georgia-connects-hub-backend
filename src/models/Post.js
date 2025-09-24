import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Post = sequelize.define(
  "Post",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "teams",
        key: "id",
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: [1, 5000],
      },
    },
    type: {
      type: DataTypes.ENUM("text", "image", "poll", "video", "link"),
      defaultValue: "text",
    },
    mediaUrl: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
    },
    mediaType: {
      type: DataTypes.ENUM(
        "image/jpeg",
        "image/png",
        "image/gif",
        "video/mp4",
        "video/mpeg"
      ),
      allowNull: true,
    },
    pollOptions: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    pollResults: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    pollExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT), // PostgreSQL array of text
      defaultValue: [],
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    commentCount: {
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
    views: {
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
    isPinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    tableName: "posts",
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ["authorId"],
      },
      {
        fields: ["teamId"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["isPublic"],
      },
      {
        fields: ["createdAt"],
      },
      {
        fields: ["tags"],
        using: "gin",
      },
    ],
  }
);

export default Post;
