import express from "express";
import { Op } from "sequelize";
import { Quiz, QuizAttempt, User } from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { validate, createQuizSchema } from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get quizzes
router.get(
  "/",
  optionalAuth,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      difficulty,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true, isPublic: true };

    // Add filters
    if (category) {
      whereClause.category = category;
    }

    if (difficulty) {
      whereClause.difficulty = difficulty;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: quizzes } = await Quiz.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        quizzes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalQuizzes: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get single quiz
router.get(
  "/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const quiz = await Quiz.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
    });

    if (!quiz || !quiz.isActive || !quiz.isPublic) {
      throw new NotFoundError("Quiz not found");
    }

    // Don't send answers if user hasn't attempted the quiz
    let userAttempt = null;
    if (req.user) {
      userAttempt = await QuizAttempt.findOne({
        where: { quizId: id, userId: req.user.id },
      });
    }

    // Remove correct answers from questions if user hasn't attempted
    const quizData = quiz.toJSON();
    if (!userAttempt) {
      quizData.questions = quizData.questions.map((question) => ({
        ...question,
        correctAnswer: undefined,
        explanation: undefined,
      }));
    }

    res.json({
      success: true,
      data: {
        quiz: quizData,
        userAttempt,
      },
    });
  })
);

// Create quiz
router.post(
  "/",
  authenticate,
  validate(createQuizSchema),
  catchAsync(async (req, res) => {
    const quizData = {
      ...req.body,
      creatorId: req.user.id,
    };

    const quiz = await Quiz.create(quizData);

    logger.info("Quiz created successfully", {
      quizId: quiz.id,
      creatorId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: {
        quiz,
      },
    });
  })
);

// Update quiz
router.put(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    // Check if user owns this quiz
    if (quiz.creatorId !== req.user.id) {
      throw new ValidationError("You can only edit your own quizzes");
    }

    await quiz.update(req.body);

    logger.info("Quiz updated successfully", {
      quizId: id,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Quiz updated successfully",
      data: {
        quiz,
      },
    });
  })
);

// Delete quiz
router.delete(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const quiz = await Quiz.findByPk(id);

    if (!quiz) {
      throw new NotFoundError("Quiz not found");
    }

    // Check if user owns this quiz
    if (quiz.creatorId !== req.user.id) {
      throw new ValidationError("You can only delete your own quizzes");
    }

    await quiz.update({ isActive: false });

    logger.info("Quiz deactivated successfully", {
      quizId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Quiz deactivated successfully",
    });
  })
);

// Submit quiz attempt
router.post(
  "/:id/attempt",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { answers, timeSpent } = req.body;

    const quiz = await Quiz.findByPk(id);

    if (!quiz || !quiz.isActive || !quiz.isPublic) {
      throw new NotFoundError("Quiz not found");
    }

    // Check if user has already attempted this quiz
    const existingAttempt = await QuizAttempt.findOne({
      where: { quizId: id, userId: req.user.id },
    });

    if (existingAttempt) {
      throw new ConflictError("You have already attempted this quiz");
    }

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = quiz.questions.length;

    answers.forEach((answer, index) => {
      if (
        quiz.questions[index] &&
        answer === quiz.questions[index].correctAnswer
      ) {
        correctAnswers++;
      }
    });

    const score = Math.round((correctAnswers / totalQuestions) * 100);
    const percentage = score;

    // Create attempt
    const attempt = await QuizAttempt.create({
      quizId: id,
      userId: req.user.id,
      score,
      percentage,
      timeSpent: timeSpent || 0,
      answers,
      correctAnswers,
      totalQuestions,
      isCompleted: true,
      completedAt: new Date(),
    });

    // Update quiz statistics
    const totalAttempts = await QuizAttempt.count({ where: { quizId: id } });
    const avgScore = await QuizAttempt.findOne({
      where: { quizId: id },
      attributes: [
        [
          Quiz.sequelize.fn("AVG", Quiz.sequelize.col("percentage")),
          "avgScore",
        ],
      ],
    });

    await quiz.update({
      totalAttempts,
      averageScore: avgScore ? parseFloat(avgScore.dataValues.avgScore) : 0,
    });

    // Award points and badge if applicable
    let pointsAwarded = 0;
    let badgeEarned = null;

    if (score >= 80) {
      // 80% or higher
      pointsAwarded = quiz.points;
      await req.user.increment("totalPoints", { by: pointsAwarded });

      if (quiz.badge) {
        badgeEarned = quiz.badge;
        attempt.badgeEarned = badgeEarned;
        await attempt.save();
      }
    }

    logger.info("Quiz attempt submitted", {
      quizId: id,
      userId: req.user.id,
      score,
      pointsAwarded,
      badgeEarned,
    });

    res.status(201).json({
      success: true,
      message: "Quiz attempt submitted successfully",
      data: {
        attempt: {
          ...attempt.toJSON(),
          pointsAwarded,
          badgeEarned,
        },
      },
    });
  })
);

// Get user's quiz attempts
router.get(
  "/:id/attempts",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const quiz = await Quiz.findByPk(id);

    if (!quiz || !quiz.isActive || !quiz.isPublic) {
      throw new NotFoundError("Quiz not found");
    }

    const { count, rows: attempts } = await QuizAttempt.findAndCountAll({
      where: { quizId: id },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
      order: [
        ["score", "DESC"],
        ["timeSpent", "ASC"],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalAttempts: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get user's quiz history
router.get(
  "/user/history",
  authenticate,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: attempts } = await QuizAttempt.findAndCountAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Quiz,
          as: "quiz",
          attributes: ["id", "title", "category", "difficulty", "points"],
        },
      ],
      order: [["completedAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        attempts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalAttempts: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

export default router;
