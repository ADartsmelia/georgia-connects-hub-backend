import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Notification = sequelize.define(
  "Notification",
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
    type: {
      type: DataTypes.ENUM(
        "connection_request",
        "connection_accepted",
        "connection_rejected",
        "post_liked",
        "post_commented",
        "post_shared",
        "comment_liked",
        "message_received",
        "chat_mention",
        "quiz_completed",
        "badge_earned",
        "contest_winner",
        "contest_entry_approved",
        "offer_available",
        "system_announcement"
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
    },
    relatedUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    relatedPostId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "posts",
        key: "id",
      },
    },
    relatedCommentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "comments",
        key: "id",
      },
    },
    relatedConnectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "connections",
        key: "id",
      },
    },
    relatedChatId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "chats",
        key: "id",
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ["userId", "isRead"],
      },
      {
        fields: ["userId", "type"],
      },
      {
        fields: ["createdAt"],
      },
      {
        fields: ["expiresAt"],
      },
    ],
  }
);

export default Notification;
