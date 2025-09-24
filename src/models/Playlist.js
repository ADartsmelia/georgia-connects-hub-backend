import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Playlist = sequelize.define(
  "Playlist",
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
    category: {
      type: DataTypes.ENUM("Education", "Business", "Inspiration", "Skills"),
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: false,
      validate: {
        isUrl: true,
      },
    },
    duration: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    thumbnail: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
    },
    addedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    downvotes: {
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
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isFeatured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    tableName: "playlist",
    timestamps: true,
    indexes: [
      {
        fields: ["category"],
      },
      {
        fields: ["addedBy"],
      },
      {
        fields: ["upvotes"],
      },
      {
        fields: ["isApproved"],
      },
      {
        fields: ["isFeatured"],
      },
    ],
  }
);

export default Playlist;
