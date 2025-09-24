import express from "express";
import { Op } from "sequelize";
import {
  User,
  Connection,
  Post,
  Comment,
  UserBadge,
  Badge,
} from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import {
  validate,
  updateProfileSchema,
  completeProfileSchema,
  validateQuery,
} from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user profile by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get user profile by ID
router.get(
  "/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: {
        exclude: [
          "password",
          "refreshToken",
          "passwordResetToken",
          "emailVerificationToken",
        ],
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Get additional user data
    const [postsCount, connectionsCount, badges] = await Promise.all([
      Post.count({ where: { authorId: id, isPublic: true } }),
      Connection.count({
        where: {
          [Op.or]: [{ requesterId: id }, { addresseeId: id }],
          status: "accepted",
        },
      }),
      UserBadge.findAll({
        where: { userId: id, isEarned: true },
        include: [{ model: Badge, as: "badge" }],
      }),
    ]);

    // Check if current user is connected to this user
    let connectionStatus = null;
    if (req.user && req.user.id !== id) {
      const connection = await Connection.findOne({
        where: {
          [Op.or]: [
            { requesterId: req.user.id, addresseeId: id },
            { requesterId: id, addresseeId: req.user.id },
          ],
        },
      });

      if (connection) {
        connectionStatus = connection.status;
      }
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        stats: {
          postsCount,
          connectionsCount,
          badges: badges.length,
        },
        connectionStatus,
        badges: badges.map((ub) => ub.badge),
      },
    });
  })
);

// Complete user profile (required after registration)
router.post(
  "/complete-profile",
  authenticate,
  validate(completeProfileSchema),
  catchAsync(async (req, res) => {
    const userId = req.user.id;
    const profileData = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Update user with profile completion data
    await user.update(profileData);

    logger.info("User profile completed", {
      userId,
      updatedFields: Object.keys(profileData),
    });

    res.json({
      success: true,
      message: "Profile completed successfully",
      data: {
        user: user.toJSON(),
      },
    });
  })
);

// Update user profile
router.put(
  "/profile",
  authenticate,
  validate(updateProfileSchema),
  catchAsync(async (req, res) => {
    const userId = req.user.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.email;
    delete updateData.password;
    delete updateData.isEmailVerified;
    delete updateData.isActive;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Update user
    await user.update(updateData);

    logger.info("User profile updated", {
      userId,
      updatedFields: Object.keys(updateData),
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: user.toJSON(),
      },
    });
  })
);

// Search users
router.get(
  "/",
  optionalAuth,
  catchAsync(async (req, res) => {
    const {
      search,
      industry,
      location,
      experience,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    // Add search filters
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } },
        { jobTitle: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (industry) {
      whereClause.industry = industry;
    }

    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }

    if (experience) {
      whereClause.experience = experience;
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: {
        exclude: [
          "password",
          "refreshToken",
          "passwordResetToken",
          "emailVerificationToken",
        ],
      },
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalUsers: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get user's connections
router.get(
  "/:id/connections",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: connections } = await Connection.findAndCountAll({
      where: {
        [Op.or]: [{ requesterId: id }, { addresseeId: id }],
        status: "accepted",
      },
      include: [
        {
          model: User,
          as: "requester",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "company",
            "jobTitle",
          ],
        },
        {
          model: User,
          as: "addressee",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "company",
            "jobTitle",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Format connections to show the other user
    const formattedConnections = connections.map((connection) => {
      const otherUser =
        connection.requesterId === id
          ? connection.addressee
          : connection.requester;
      return {
        id: connection.id,
        user: otherUser,
        connectedAt: connection.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        connections: formattedConnections,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalConnections: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get user's posts
router.get(
  "/:id/posts",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const offset = (page - 1) * limit;

    const { count, rows: posts } = await Post.findAndCountAll({
      where: {
        authorId: id,
        isPublic: true,
        isDeleted: false,
      },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "avatar", "company"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalPosts: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get user's badges
router.get(
  "/:id/badges",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const userBadges = await UserBadge.findAll({
      where: { userId: id, isEarned: true },
      include: [{ model: Badge, as: "badge" }],
      order: [["earnedAt", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        badges: userBadges.map((ub) => ({
          ...ub.badge.toJSON(),
          earnedAt: ub.earnedAt,
        })),
      },
    });
  })
);

// Get user statistics
router.get(
  "/:id/stats",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const [
      postsCount,
      commentsCount,
      connectionsCount,
      badgesCount,
      totalPoints,
    ] = await Promise.all([
      Post.count({ where: { authorId: id, isPublic: true } }),
      Comment.count({ where: { authorId: id } }),
      Connection.count({
        where: {
          [Op.or]: [{ requesterId: id }, { addresseeId: id }],
          status: "accepted",
        },
      }),
      UserBadge.count({ where: { userId: id, isEarned: true } }),
      User.findByPk(id, { attributes: ["totalPoints"] }),
    ]);

    res.json({
      success: true,
      data: {
        postsCount,
        commentsCount,
        connectionsCount,
        badgesCount,
        totalPoints: totalPoints?.totalPoints || 0,
      },
    });
  })
);

// Update user settings
router.put(
  "/settings",
  authenticate,
  catchAsync(async (req, res) => {
    const { notificationSettings, privacySettings, preferences } = req.body;

    const updateData = {};
    if (notificationSettings)
      updateData.notificationSettings = notificationSettings;
    if (privacySettings) updateData.privacySettings = privacySettings;
    if (preferences) updateData.preferences = preferences;

    await req.user.update(updateData);

    logger.info("User settings updated", {
      userId: req.user.id,
      updatedSettings: Object.keys(updateData),
    });

    res.json({
      success: true,
      message: "Settings updated successfully",
      data: {
        user: req.user.toJSON(),
      },
    });
  })
);

// Delete user account
router.delete(
  "/account",
  authenticate,
  catchAsync(async (req, res) => {
    const { password } = req.body;

    if (!password) {
      throw new ValidationError("Password is required to delete account");
    }

    // Verify password
    const isPasswordValid = await req.user.comparePassword(password);
    if (!isPasswordValid) {
      throw new ValidationError("Invalid password");
    }

    // Deactivate account instead of hard delete
    await req.user.update({
      isActive: false,
      email: `deleted_${Date.now()}_${req.user.email}`, // Make email unique for soft delete
    });

    logger.info("User account deleted", { userId: req.user.id });

    res.json({
      success: true,
      message: "Account deleted successfully",
    });
  })
);

export default router;
