import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const ChatMember = sequelize.define(
  "ChatMember",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    chatId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "chats",
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
      type: DataTypes.ENUM("admin", "moderator", "member"),
      defaultValue: "member",
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    lastReadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    muteUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    unreadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
  },
  {
    tableName: "chat_members",
    timestamps: true,
    indexes: [
      {
        fields: ["chatId"],
      },
      {
        fields: ["userId"],
      },
      {
        unique: true,
        fields: ["chatId", "userId"],
      },
    ],
  }
);

export default ChatMember;
