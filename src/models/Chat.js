import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Chat = sequelize.define(
  "Chat",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: [1, 100],
      },
    },
    type: {
      type: DataTypes.ENUM("direct", "group"),
      defaultValue: "direct",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    avatar: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    lastMessageAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        allowInvites: true,
        allowFileSharing: true,
        allowMediaSharing: true,
      },
    },
  },
  {
    tableName: "chats",
    timestamps: true,
    indexes: [
      {
        fields: ["type"],
      },
      {
        fields: ["createdBy"],
      },
      {
        fields: ["lastMessageAt"],
      },
    ],
  }
);

export default Chat;
