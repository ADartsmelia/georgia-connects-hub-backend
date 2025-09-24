import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

const Like = sequelize.define(
  "Like",
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
      onDelete: "CASCADE",
    },
    postId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "posts",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "likes",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["userId", "postId"],
        name: "unique_user_post_like",
      },
      {
        fields: ["postId"],
        name: "idx_likes_post_id",
      },
      {
        fields: ["userId"],
        name: "idx_likes_user_id",
      },
    ],
  }
);

export default Like;
