import jwt from "jsonwebtoken";
import {
  User,
  Chat,
  Message,
  ChatMember,
  Connection,
} from "../models/index.js";
import { logger } from "../utils/logger.js";

// Store active users and their socket connections
const activeUsers = new Map();
const userSockets = new Map();

export const setupSocketHandlers = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId, {
        attributes: ["id", "firstName", "lastName", "avatar", "isActive"],
      });

      if (!user || !user.isActive) {
        return next(
          new Error("Authentication error: User not found or inactive")
        );
      }

      socket.userId = user.id;
      socket.user = user;
      next();
    } catch (error) {
      logger.error("Socket authentication error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    logger.info("User connected to socket", { userId, socketId: socket.id });

    // Store user connection
    activeUsers.set(userId, {
      socketId: socket.id,
      user: user,
      connectedAt: new Date(),
      lastSeen: new Date(),
    });

    userSockets.set(socket.id, userId);

    // Join user to their personal room
    socket.join(`user_${userId}`);

    // Update user's online status
    socket.broadcast.emit("user_online", {
      userId: userId,
      user: user,
      timestamp: new Date(),
    });

    // Handle joining chat rooms
    socket.on("join_chat", async (chatId) => {
      try {
        // Verify user is member of the chat
        const membership = await ChatMember.findOne({
          where: {
            chatId: chatId,
            userId: userId,
            status: "active",
          },
        });

        if (!membership) {
          socket.emit("error", {
            message: "You are not a member of this chat",
          });
          return;
        }

        socket.join(`chat_${chatId}`);
        logger.info("User joined chat room", {
          userId,
          chatId,
          socketId: socket.id,
        });

        // Notify other members
        socket.to(`chat_${chatId}`).emit("user_joined_chat", {
          userId: userId,
          user: user,
          chatId: chatId,
          timestamp: new Date(),
        });

        // Mark messages as read
        await ChatMember.update(
          { lastReadAt: new Date() },
          {
            where: {
              chatId: chatId,
              userId: userId,
            },
          }
        );
      } catch (error) {
        logger.error("Error joining chat:", error);
        socket.emit("error", { message: "Failed to join chat" });
      }
    });

    // Handle leaving chat rooms
    socket.on("leave_chat", (chatId) => {
      socket.leave(`chat_${chatId}`);
      logger.info("User left chat room", {
        userId,
        chatId,
        socketId: socket.id,
      });

      socket.to(`chat_${chatId}`).emit("user_left_chat", {
        userId: userId,
        user: user,
        chatId: chatId,
        timestamp: new Date(),
      });
    });

    // Handle sending messages
    socket.on("send_message", async (data) => {
      try {
        const { chatId, content, type = "text", replyToId } = data;

        // Verify user is member of the chat
        const membership = await ChatMember.findOne({
          where: {
            chatId: chatId,
            userId: userId,
            status: "active",
          },
        });

        if (!membership) {
          socket.emit("error", {
            message: "You are not a member of this chat",
          });
          return;
        }

        // Create message
        const message = await Message.create({
          chatId: chatId,
          senderId: userId,
          content: content,
          type: type,
          replyToId: replyToId,
        });

        // Load message with sender info
        const messageWithSender = await Message.findByPk(message.id, {
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "firstName", "lastName", "avatar"],
            },
          ],
        });

        // Update chat's last message time
        await Chat.update(
          { lastMessageAt: new Date() },
          { where: { id: chatId } }
        );

        // Broadcast message to chat room
        io.to(`chat_${chatId}`).emit("new_message", {
          message: messageWithSender,
          chatId: chatId,
          timestamp: new Date(),
        });

        logger.info("Message sent via socket", {
          messageId: message.id,
          chatId,
          senderId: userId,
        });
      } catch (error) {
        logger.error("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit("user_typing", {
        userId: userId,
        user: user,
        chatId: chatId,
        isTyping: true,
        timestamp: new Date(),
      });
    });

    socket.on("typing_stop", (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit("user_typing", {
        userId: userId,
        user: user,
        chatId: chatId,
        isTyping: false,
        timestamp: new Date(),
      });
    });

    // Handle connection requests
    socket.on("send_connection_request", async (data) => {
      try {
        const { addresseeId, message } = data;

        if (addresseeId === userId) {
          socket.emit("error", {
            message: "Cannot send connection request to yourself",
          });
          return;
        }

        // Check if addressee is online
        const addresseeConnection = activeUsers.get(addresseeId);

        if (addresseeConnection) {
          // Send real-time notification
          io.to(`user_${addresseeId}`).emit("connection_request_received", {
            requesterId: userId,
            requester: user,
            message: message,
            timestamp: new Date(),
          });
        }

        logger.info("Connection request sent via socket", {
          requesterId: userId,
          addresseeId,
        });
      } catch (error) {
        logger.error("Error sending connection request:", error);
        socket.emit("error", { message: "Failed to send connection request" });
      }
    });

    // Handle accepting connection requests
    socket.on("accept_connection_request", async (data) => {
      try {
        const { requesterId } = data;

        // Check if requester is online
        const requesterConnection = activeUsers.get(requesterId);

        if (requesterConnection) {
          // Send real-time notification
          io.to(`user_${requesterId}`).emit("connection_request_accepted", {
            accepterId: userId,
            accepter: user,
            timestamp: new Date(),
          });
        }

        logger.info("Connection request accepted via socket", {
          requesterId,
          accepterId: userId,
        });
      } catch (error) {
        logger.error("Error accepting connection request:", error);
        socket.emit("error", {
          message: "Failed to accept connection request",
        });
      }
    });

    // Handle post likes/comments
    socket.on("post_liked", async (data) => {
      try {
        const { postId, authorId } = data;

        // Notify post author if they're online
        const authorConnection = activeUsers.get(authorId);

        if (authorConnection && authorId !== userId) {
          io.to(`user_${authorId}`).emit("post_liked_notification", {
            postId: postId,
            likerId: userId,
            liker: user,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        logger.error("Error handling post like:", error);
      }
    });

    socket.on("post_commented", async (data) => {
      try {
        const { postId, authorId } = data;

        // Notify post author if they're online
        const authorConnection = activeUsers.get(authorId);

        if (authorConnection && authorId !== userId) {
          io.to(`user_${authorId}`).emit("post_commented_notification", {
            postId: postId,
            commenterId: userId,
            commenter: user,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        logger.error("Error handling post comment:", error);
      }
    });

    // Handle user activity updates
    socket.on("update_activity", async () => {
      try {
        // Update user's last activity
        await User.update(
          { lastActivityDate: new Date() },
          { where: { id: userId } }
        );

        // Update in active users map
        if (activeUsers.has(userId)) {
          activeUsers.get(userId).lastSeen = new Date();
        }
      } catch (error) {
        logger.error("Error updating user activity:", error);
      }
    });

    // Handle notification preferences
    socket.on("notification_preferences", async (data) => {
      try {
        // Update user's notification preferences
        await User.update(
          {
            notificationPreferences: data.preferences,
            pushNotifications: data.pushNotifications,
          },
          { where: { id: userId } }
        );

        socket.emit("notification_preferences_updated", {
          success: true,
          preferences: data.preferences,
        });
      } catch (error) {
        logger.error("Error updating notification preferences:", error);
        socket.emit("notification_preferences_error", {
          error: "Failed to update notification preferences",
        });
      }
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date() });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      logger.info("User disconnected from socket", {
        userId,
        socketId: socket.id,
        reason,
      });

      // Remove from active users
      activeUsers.delete(userId);
      userSockets.delete(socket.id);

      // Broadcast user offline status
      socket.broadcast.emit("user_offline", {
        userId: userId,
        timestamp: new Date(),
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error("Socket error:", { userId, error });
    });
  });

  // Cleanup inactive connections periodically
  setInterval(() => {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [userId, connection] of activeUsers.entries()) {
      if (now - connection.lastSeen > inactiveThreshold) {
        logger.info("Removing inactive user connection", { userId });
        activeUsers.delete(userId);

        // Notify others that user went offline
        io.emit("user_offline", {
          userId: userId,
          timestamp: now,
        });
      }
    }
  }, 60000); // Check every minute

  logger.info("Socket handlers initialized");
};

// Utility functions
export const getActiveUsers = () => {
  return Array.from(activeUsers.values()).map((connection) => ({
    userId: connection.user.id,
    user: connection.user,
    connectedAt: connection.connectedAt,
    lastSeen: connection.lastSeen,
  }));
};

export const isUserOnline = (userId) => {
  return activeUsers.has(userId);
};

export const sendToUser = (io, userId, event, data) => {
  const connection = activeUsers.get(userId);
  if (connection) {
    io.to(`user_${userId}`).emit(event, data);
    return true;
  }
  return false;
};

export const sendToChat = (io, chatId, event, data) => {
  io.to(`chat_${chatId}`).emit(event, data);
};

export default {
  setupSocketHandlers,
  getActiveUsers,
  isUserOnline,
  sendToUser,
  sendToChat,
};
