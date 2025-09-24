import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const Quiz = sequelize.define(
  "Quiz",
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
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    difficulty: {
      type: DataTypes.ENUM("Easy", "Medium", "Hard"),
      defaultValue: "Medium",
    },
    timeLimit: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 100,
      validate: {
        min: 0,
      },
    },
    badge: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    questions: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    creatorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    totalAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    averageScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    tableName: "quizzes",
    timestamps: true,
    indexes: [
      {
        fields: ["category"],
      },
      {
        fields: ["difficulty"],
      },
      {
        fields: ["isActive"],
      },
      {
        fields: ["isPublic"],
      },
      {
        fields: ["creatorId"],
      },
    ],
  }
);

export default Quiz;
