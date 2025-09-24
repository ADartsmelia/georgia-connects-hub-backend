import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Team = sequelize.define(
  "Team",
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
      validate: {
        len: [0, 1000],
      },
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    inviteCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
    },
    memberCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: {
        min: 0,
      },
    },
    postCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.TEXT), // PostgreSQL array of text
      defaultValue: [],
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        allowMemberPosts: true,
        requireApproval: false,
        allowInvites: true,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    tableName: "teams",
    timestamps: true,
    indexes: [
      {
        fields: ["creatorId"],
      },
      {
        fields: ["isPrivate"],
      },
      {
        fields: ["inviteCode"],
      },
      {
        fields: ["tags"],
        using: "gin",
      },
    ],
  }
);

export default Team;
