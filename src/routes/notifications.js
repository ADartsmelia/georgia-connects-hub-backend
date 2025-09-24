import express from "express";
import {
  Notification,
  User,
  Post,
  Comment,
  Connection,
  Chat,
} from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validation.js";
import {
  AppError,
  NotFoundError,
  ValidationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get user notifications with pagination
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      userId: req.user.id,
      isDeleted: false,
    };

    if (type) {
      whereClause.type = type;
    }

    if (unreadOnly === "true") {
      whereClause.isRead = false;
    }

    const notifications = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "relatedUser",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "jobTitle",
            "company",
          ],
        },
        {
          model: Post,
          as: "relatedPost",
          attributes: ["id", "content", "type", "mediaUrl"],
        },
        {
          model: Comment,
          as: "relatedComment",
          attributes: ["id", "content"],
        },
        {
          model: Connection,
          as: "relatedConnection",
          attributes: ["id", "status"],
        },
        {
          model: Chat,
          as: "relatedChat",
          attributes: ["id", "name", "type"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: notifications.count,
          pages: Math.ceil(notifications.count / limit),
        },
      },
    });
  } catch (error) {
    logger.error("Error fetching notifications:", error);
    next(error);
  }
});

// Get notification count (unread)
router.get("/count", authenticate, async (req, res, next) => {
  try {
    const unreadCount = await Notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
        isDeleted: false,
      },
    });

    res.json({
      success: true,
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    logger.error("Error fetching notification count:", error);
    next(error);
  }
});

// Mark notification as read
router.put("/:id/read", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        userId: req.user.id,
        isDeleted: false,
      },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    await notification.update({ isRead: true });

    res.json({
      success: true,
      data: {
        notification,
      },
    });
  } catch (error) {
    logger.error("Error marking notification as read:", error);
    next(error);
  }
});

// Mark all notifications as read
router.put("/mark-all-read", authenticate, async (req, res, next) => {
  try {
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: req.user.id,
          isRead: false,
          isDeleted: false,
        },
      }
    );

    res.json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    logger.error("Error marking all notifications as read:", error);
    next(error);
  }
});

// Delete notification
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: {
        id,
        userId: req.user.id,
        isDeleted: false,
      },
    });

    if (!notification) {
      throw new NotFoundError("Notification not found");
    }

    await notification.update({ isDeleted: true });

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    logger.error("Error deleting notification:", error);
    next(error);
  }
});

// Delete all notifications
router.delete("/", authenticate, async (req, res, next) => {
  try {
    await Notification.update(
      { isDeleted: true },
      {
        where: {
          userId: req.user.id,
          isDeleted: false,
        },
      }
    );

    res.json({
      success: true,
      message: "All notifications deleted",
    });
  } catch (error) {
    logger.error("Error deleting all notifications:", error);
    next(error);
  }
});

// Get notification preferences
router.get("/preferences", authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "notificationPreferences",
        "emailNotifications",
        "pushNotifications",
        "marketingEmails",
      ],
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.json({
      success: true,
      data: {
        preferences: user.notificationPreferences || {},
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
        marketingEmails: user.marketingEmails,
      },
    });
  } catch (error) {
    logger.error("Error fetching notification preferences:", error);
    next(error);
  }
});

// Update notification preferences
router.put(
  "/preferences",
  authenticate,
  validate({
    body: {
      notificationPreferences: "object",
      emailNotifications: "boolean",
      pushNotifications: "boolean",
      marketingEmails: "boolean",
    },
  }),
  async (req, res, next) => {
    try {
      const {
        notificationPreferences,
        emailNotifications,
        pushNotifications,
        marketingEmails,
      } = req.body;

      const user = await User.findByPk(req.user.id);

      if (!user) {
        throw new NotFoundError("User not found");
      }

      await user.update({
        notificationPreferences,
        emailNotifications,
        pushNotifications,
        marketingEmails,
      });

      res.json({
        success: true,
        data: {
          preferences: user.notificationPreferences,
          emailNotifications: user.emailNotifications,
          pushNotifications: user.pushNotifications,
          marketingEmails: user.marketingEmails,
        },
      });
    } catch (error) {
      logger.error("Error updating notification preferences:", error);
      next(error);
    }
  }
);

// Create notification (admin/system use)
router.post(
  "/",
  authenticate,
  validate({
    body: {
      userId: "string",
      type: "string",
      title: "string",
      message: "string",
      data: "object",
      priority: "string",
      relatedUserId: "string",
      relatedPostId: "string",
      relatedCommentId: "string",
      relatedConnectionId: "string",
      relatedChatId: "string",
      expiresAt: "date",
    },
  }),
  async (req, res, next) => {
    try {
      // Check if user is admin or system
      if (!req.user.isAdmin && !req.user.isSystem) {
        throw new AppError("Unauthorized to create notifications", 403);
      }

      const {
        userId,
        type,
        title,
        message,
        data = {},
        priority = "medium",
        relatedUserId,
        relatedPostId,
        relatedCommentId,
        relatedConnectionId,
        relatedChatId,
        expiresAt,
      } = req.body;

      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        priority,
        relatedUserId,
        relatedPostId,
        relatedCommentId,
        relatedConnectionId,
        relatedChatId,
        expiresAt,
      });

      // Emit real-time notification via socket
      if (global.io) {
        global.io.to(`user_${userId}`).emit("new_notification", {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: notification.priority,
          createdAt: notification.createdAt,
        });
      }

      res.status(201).json({
        success: true,
        data: {
          notification,
        },
      });
    } catch (error) {
      logger.error("Error creating notification:", error);
      next(error);
    }
  }
);

export default router;
