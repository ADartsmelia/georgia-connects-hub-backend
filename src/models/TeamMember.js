import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const TeamMember = sequelize.define(
  "TeamMember",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    teamId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "teams",
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
    role: {
      type: DataTypes.ENUM("owner", "admin", "moderator", "member"),
      defaultValue: "member",
    },
    status: {
      type: DataTypes.ENUM("active", "pending", "banned"),
      defaultValue: "pending",
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    invitedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    permissions: {
      type: DataTypes.JSONB,
      defaultValue: {
        canPost: true,
        canComment: true,
        canInvite: false,
        canModerate: false,
      },
    },
  },
  {
    tableName: "team_members",
    timestamps: true,
    indexes: [
      {
        fields: ["teamId"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["role"],
      },
      {
        fields: ["status"],
      },
      {
        unique: true,
        fields: ["teamId", "userId"],
      },
    ],
  }
);

export default TeamMember;
