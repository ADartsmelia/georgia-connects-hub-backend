import express from "express";
import { Badge, UserBadge, User } from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { catchAsync, NotFoundError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get all badges
router.get(
  "/",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { category, rarity } = req.query;

    const whereClause = { isActive: true };

    if (category) {
      whereClause.category = category;
    }

    if (rarity) {
      whereClause.rarity = rarity;
    }

    const badges = await Badge.findAll({
      where: whereClause,
      order: [
        ["category", "ASC"],
        ["rarity", "ASC"],
      ],
    });

    res.json({
      success: true,
      data: {
        badges,
      },
    });
  })
);

// Get single badge
router.get(
  "/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const badge = await Badge.findByPk(id);

    if (!badge || !badge.isActive) {
      throw new NotFoundError("Badge not found");
    }

    res.json({
      success: true,
      data: {
        badge,
      },
    });
  })
);

// Get user's badges
router.get(
  "/user/:userId",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { userId } = req.params;

    const userBadges = await UserBadge.findAll({
      where: { userId, isEarned: true },
      include: [
        {
          model: Badge,
          as: "badge",
        },
      ],
      order: [["earnedAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        badges: userBadges.map((ub) => ({
          ...ub.badge.toJSON(),
          earnedAt: ub.earnedAt,
          progress: ub.progress,
          maxProgress: ub.maxProgress,
        })),
      },
    });
  })
);

// Get user's badge progress
router.get(
  "/user/:userId/progress",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { userId } = req.params;

    const userBadges = await UserBadge.findAll({
      where: { userId },
      include: [
        {
          model: Badge,
          as: "badge",
        },
      ],
      order: [["badge", "category", "ASC"]],
    });

    // Group badges by category
    const badgesByCategory = userBadges.reduce((acc, ub) => {
      const category = ub.badge.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        ...ub.badge.toJSON(),
        earnedAt: ub.earnedAt,
        progress: ub.progress,
        maxProgress: ub.maxProgress,
        isEarned: ub.isEarned,
      });
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        badgesByCategory,
      },
    });
  })
);

// Award badge to user (admin only)
router.post(
  "/:id/award",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to award badges

    const badge = await Badge.findByPk(id);

    if (!badge || !badge.isActive) {
      throw new NotFoundError("Badge not found");
    }

    const user = await User.findByPk(userId);

    if (!user || !user.isActive) {
      throw new NotFoundError("User not found");
    }

    // Check if user already has this badge
    const existingUserBadge = await UserBadge.findOne({
      where: { userId, badgeId: id },
    });

    if (existingUserBadge && existingUserBadge.isEarned) {
      return res.json({
        success: true,
        message: "User already has this badge",
        data: {
          userBadge: existingUserBadge,
        },
      });
    }

    // Award badge
    const userBadge = await UserBadge.upsert({
      userId,
      badgeId: id,
      isEarned: true,
      earnedAt: new Date(),
      progress: 100,
      maxProgress: 100,
    });

    logger.info("Badge awarded to user", {
      badgeId: id,
      userId,
      awardedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Badge awarded successfully",
      data: {
        userBadge: userBadge[0],
      },
    });
  })
);

// Update badge progress
router.put(
  "/:id/progress",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { progress } = req.body;

    const badge = await Badge.findByPk(id);

    if (!badge || !badge.isActive) {
      throw new NotFoundError("Badge not found");
    }

    if (progress < 0 || progress > 100) {
      throw new ValidationError("Progress must be between 0 and 100");
    }

    // Find or create user badge record
    const [userBadge, created] = await UserBadge.findOrCreate({
      where: { userId: req.user.id, badgeId: id },
      defaults: {
        userId: req.user.id,
        badgeId: id,
        progress: 0,
        maxProgress: 100,
        isEarned: false,
      },
    });

    // Update progress
    await userBadge.update({ progress });

    // Check if badge should be earned
    if (progress >= 100 && !userBadge.isEarned) {
      await userBadge.update({
        isEarned: true,
        earnedAt: new Date(),
      });

      logger.info("Badge earned by user", { badgeId: id, userId: req.user.id });

      res.json({
        success: true,
        message: "Badge earned!",
        data: {
          userBadge,
          earned: true,
        },
      });
    } else {
      res.json({
        success: true,
        message: "Badge progress updated",
        data: {
          userBadge,
          earned: false,
        },
      });
    }
  })
);

export default router;
