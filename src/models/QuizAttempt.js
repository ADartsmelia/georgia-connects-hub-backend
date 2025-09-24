import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

export const QuizAttempt = sequelize.define(
  "QuizAttempt",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    quizId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "quizzes",
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
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    timeSpent: {
      type: DataTypes.INTEGER, // in seconds
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    answers: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    correctAnswers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    isCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    badgeEarned: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "quiz_attempts",
    timestamps: true,
    indexes: [
      {
        fields: ["quizId"],
      },
      {
        fields: ["userId"],
      },
      {
        fields: ["score"],
      },
      {
        fields: ["completedAt"],
      },
      {
        unique: true,
        fields: ["quizId", "userId"],
      },
    ],
  }
);

export default QuizAttempt;
