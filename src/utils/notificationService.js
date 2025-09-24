"use strict";

const { Notification, User } = require("../models");
const { logger } = require("./logger");
const { sendEmail } = require("./email");

class NotificationService {
  /**
   * Create a notification for a user
   */
  static async createNotification({
    userId,
    type,
    title,
    message,
    data = {},
    priority = "medium",
    relatedUserId = null,
    relatedPostId = null,
    relatedCommentId = null,
    relatedConnectionId = null,
    relatedChatId = null,
    expiresAt = null,
  }) {
    try {
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

      // Send email notification if user has email notifications enabled
      const user = await User.findByPk(userId, {
        attributes: [
          "email",
          "firstName",
          "emailNotifications",
          "notificationPreferences",
        ],
      });

      if (user && user.emailNotifications && this.shouldSendEmail(user, type)) {
        await this.sendEmailNotification(user, notification);
      }

      return notification;
    } catch (error) {
      logger.error("Error creating notification:", error);
      throw error;
    }
  }

  /**
   * Create multiple notifications for multiple users
   */
  static async createBulkNotifications(notifications) {
    try {
      const createdNotifications = await Notification.bulkCreate(notifications);

      // Emit real-time notifications
      if (global.io) {
        for (const notification of createdNotifications) {
          global.io.to(`user_${notification.userId}`).emit("new_notification", {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            priority: notification.priority,
            createdAt: notification.createdAt,
          });
        }
      }

      return createdNotifications;
    } catch (error) {
      logger.error("Error creating bulk notifications:", error);
      throw error;
    }
  }

  /**
   * Create connection request notification
   */
  static async createConnectionRequestNotification(requesterId, addresseeId) {
    const requester = await User.findByPk(requesterId, {
      attributes: ["firstName", "lastName", "jobTitle", "company"],
    });

    if (!requester) return;

    return this.createNotification({
      userId: addresseeId,
      type: "connection_request",
      title: "New Connection Request",
      message: `${requester.firstName} ${requester.lastName} wants to connect with you`,
      data: {
        requesterId,
        requesterName: `${requester.firstName} ${requester.lastName}`,
        requesterTitle: requester.jobTitle,
        requesterCompany: requester.company,
      },
      relatedUserId: requesterId,
      priority: "medium",
    });
  }

  /**
   * Create connection accepted notification
   */
  static async createConnectionAcceptedNotification(accepterId, requesterId) {
    const accepter = await User.findByPk(accepterId, {
      attributes: ["firstName", "lastName"],
    });

    if (!accepter) return;

    return this.createNotification({
      userId: requesterId,
      type: "connection_accepted",
      title: "Connection Accepted",
      message: `${accepter.firstName} ${accepter.lastName} accepted your connection request`,
      data: {
        accepterId,
        accepterName: `${accepter.firstName} ${accepter.lastName}`,
      },
      relatedUserId: accepterId,
      priority: "medium",
    });
  }

  /**
   * Create post liked notification
   */
  static async createPostLikedNotification(postAuthorId, likerId, postId) {
    const liker = await User.findByPk(likerId, {
      attributes: ["firstName", "lastName"],
    });

    if (!liker || likerId === postAuthorId) return; // Don't notify self

    return this.createNotification({
      userId: postAuthorId,
      type: "post_liked",
      title: "Post Liked",
      message: `${liker.firstName} ${liker.lastName} liked your post`,
      data: {
        likerId,
        likerName: `${liker.firstName} ${liker.lastName}`,
      },
      relatedUserId: likerId,
      relatedPostId: postId,
      priority: "low",
    });
  }

  /**
   * Create post commented notification
   */
  static async createPostCommentedNotification(
    postAuthorId,
    commenterId,
    postId,
    commentId
  ) {
    const commenter = await User.findByPk(commenterId, {
      attributes: ["firstName", "lastName"],
    });

    if (!commenter || commenterId === postAuthorId) return; // Don't notify self

    return this.createNotification({
      userId: postAuthorId,
      type: "post_commented",
      title: "New Comment",
      message: `${commenter.firstName} ${commenter.lastName} commented on your post`,
      data: {
        commenterId,
        commenterName: `${commenter.firstName} ${commenter.lastName}`,
      },
      relatedUserId: commenterId,
      relatedPostId: postId,
      relatedCommentId: commentId,
      priority: "medium",
    });
  }

  /**
   * Create new message notification
   */
  static async createMessageNotification(
    recipientId,
    senderId,
    chatId,
    messagePreview
  ) {
    const sender = await User.findByPk(senderId, {
      attributes: ["firstName", "lastName"],
    });

    if (!sender || senderId === recipientId) return; // Don't notify self

    return this.createNotification({
      userId: recipientId,
      type: "message_received",
      title: "New Message",
      message: `${sender.firstName} ${sender.lastName}: ${messagePreview}`,
      data: {
        senderId,
        senderName: `${sender.firstName} ${sender.lastName}`,
        messagePreview,
      },
      relatedUserId: senderId,
      relatedChatId: chatId,
      priority: "high",
    });
  }

  /**
   * Create badge earned notification
   */
  static async createBadgeEarnedNotification(
    userId,
    badgeName,
    badgeDescription
  ) {
    return this.createNotification({
      userId,
      type: "badge_earned",
      title: "Badge Earned!",
      message: `Congratulations! You earned the "${badgeName}" badge`,
      data: {
        badgeName,
        badgeDescription,
      },
      priority: "medium",
    });
  }

  /**
   * Create quiz completed notification
   */
  static async createQuizCompletedNotification(
    userId,
    quizTitle,
    score,
    badgeName
  ) {
    return this.createNotification({
      userId,
      type: "quiz_completed",
      title: "Quiz Completed",
      message: `You completed "${quizTitle}" with a score of ${score}%`,
      data: {
        quizTitle,
        score,
        badgeName,
      },
      priority: "medium",
    });
  }

  /**
   * Create contest winner notification
   */
  static async createContestWinnerNotification(userId, contestTitle, prize) {
    return this.createNotification({
      userId,
      type: "contest_winner",
      title: "Contest Winner!",
      message: `Congratulations! You won the "${contestTitle}" contest`,
      data: {
        contestTitle,
        prize,
      },
      priority: "high",
    });
  }

  /**
   * Create system announcement notification
   */
  static async createSystemAnnouncementNotification(
    userIds,
    title,
    message,
    data = {}
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: "system_announcement",
      title,
      message,
      data,
      priority: "medium",
    }));

    return this.createBulkNotifications(notifications);
  }

  /**
   * Check if email notification should be sent
   */
  static shouldSendEmail(user, notificationType) {
    const preferences = user.notificationPreferences || {};
    const emailSettings = preferences.email || {};

    // Check if email notifications are enabled for this type
    return emailSettings[notificationType] !== false;
  }

  /**
   * Send email notification
   */
  static async sendEmailNotification(user, notification) {
    try {
      const emailData = {
        to: user.email,
        subject: notification.title,
        template: "notification",
        context: {
          firstName: user.firstName,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          data: notification.data,
          createdAt: notification.createdAt,
        },
      };

      await sendEmail(emailData);
    } catch (error) {
      logger.error("Error sending email notification:", error);
    }
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpiredNotifications() {
    try {
      const result = await Notification.update(
        { isDeleted: true },
        {
          where: {
            expiresAt: {
              [require("sequelize").Op.lt]: new Date(),
            },
            isDeleted: false,
          },
        }
      );

      logger.info(`Cleaned up ${result[0]} expired notifications`);
      return result[0];
    } catch (error) {
      logger.error("Error cleaning up expired notifications:", error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(userId) {
    try {
      const stats = await Notification.findAll({
        where: {
          userId,
          isDeleted: false,
        },
        attributes: [
          "type",
          "isRead",
          [require("sequelize").fn("COUNT", "*"), "count"],
        ],
        group: ["type", "isRead"],
        raw: true,
      });

      return stats;
    } catch (error) {
      logger.error("Error getting notification stats:", error);
      throw error;
    }
  }
}

module.exports = NotificationService;
