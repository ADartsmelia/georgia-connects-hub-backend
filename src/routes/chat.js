import express from "express";
import { Op } from "sequelize";
import { Chat, Message, ChatMember, User } from "../models/index.js";
import { authenticate } from "../middleware/auth.js";
import {
  validate,
  createChatSchema,
  sendMessageSchema,
} from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Create a new chat
router.post(
  "/",
  authenticate,
  validate(createChatSchema),
  catchAsync(async (req, res) => {
    const { name, type, description, members } = req.body;
    const createdBy = req.user.id;

    let chat;

    if (type === "direct") {
      // For direct chats, check if one already exists between these two users
      if (!members || members.length !== 1) {
        throw new ValidationError(
          "Direct chat must have exactly one other member"
        );
      }

      const otherUserId = members[0];

      // Check if a direct chat already exists between these two users
      const existingChat = await Chat.findOne({
        where: {
          type: "direct",
        },
        include: [
          {
            model: User,
            as: "members",
            where: {
              id: { [Op.in]: [createdBy, otherUserId] },
            },
            through: { where: { isActive: true } },
            attributes: ["id"],
          },
        ],
      });

      // Verify the chat has exactly both users
      if (existingChat && existingChat.members.length === 2) {
        const memberIds = existingChat.members.map((member) => member.id);
        if (memberIds.includes(createdBy) && memberIds.includes(otherUserId)) {
          return res.json({
            success: true,
            message: "Direct chat already exists",
            data: existingChat,
          });
        }
      }

      // Create new direct chat
      chat = await Chat.create({
        type: "direct",
        createdBy,
      });
    } else {
      // Group chat
      if (!members || members.length === 0) {
        throw new ValidationError("Group chat must have at least one member");
      }

      chat = await Chat.create({
        name,
        type: "group",
        description,
        createdBy,
      });
    }

    // Add members to the chat
    const chatMembers = [
      {
        chatId: chat.id,
        userId: createdBy,
        role: "admin",
        isActive: true,
        joinedAt: new Date(),
      },
    ];

    // Add other members
    if (members) {
      members.forEach((memberId) => {
        if (memberId !== createdBy) {
          chatMembers.push({
            chatId: chat.id,
            userId: memberId,
            role: "member",
            isActive: true,
            joinedAt: new Date(),
          });
        }
      });
    }

    await ChatMember.bulkCreate(chatMembers);

    // Load the created chat with members
    const createdChat = await Chat.findByPk(chat.id, {
      include: [
        {
          model: User,
          as: "members",
          attributes: ["id", "firstName", "lastName", "avatar"],
          through: { where: { isActive: true } },
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
    });

    logger.info("Chat created successfully", {
      chatId: chat.id,
      createdBy,
      type,
    });

    res.status(201).json({
      success: true,
      message: "Chat created successfully",
      data: {
        chat: createdChat,
      },
    });
  })
);

// Get user's chats
router.get(
  "/",
  authenticate,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: chats } = await Chat.findAndCountAll({
      include: [
        {
          model: User,
          as: "members",
          where: { id: req.user.id },
          through: { where: { isActive: true } },
          attributes: [],
          required: true,
        },
        {
          model: Message,
          as: "messages",
          attributes: ["id", "content", "type", "senderId", "createdAt"],
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: 1,
        },
      ],
      order: [
        ["lastMessageAt", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get all members for each chat
    const chatsWithMembers = await Promise.all(
      chats.map(async (chat) => {
        const allMembers = await User.findAll({
          include: [
            {
              model: ChatMember,
              as: "ChatMember",
              where: {
                chatId: chat.id,
                isActive: true,
              },
              attributes: [
                "id",
                "role",
                "joinedAt",
                "lastReadAt",
                "isActive",
                "isMuted",
                "muteUntil",
                "unreadCount",
                "createdAt",
                "updatedAt",
              ],
            },
          ],
          attributes: ["id", "firstName", "lastName", "avatar"],
        });

        return {
          ...chat.toJSON(),
          members: allMembers,
        };
      })
    );

    res.json({
      success: true,
      data: {
        chats: chatsWithMembers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalChats: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get single chat with messages
router.get(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is member of this chat
    const chatMembership = await ChatMember.findOne({
      where: {
        chatId: id,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!chatMembership) {
      throw new AuthorizationError("You are not a member of this chat");
    }

    const chat = await Chat.findByPk(id, {
      include: [
        {
          model: User,
          as: "members",
          attributes: ["id", "firstName", "lastName", "avatar"],
          through: { where: { isActive: true } },
        },
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
        {
          model: Message,
          as: "messages",
          attributes: [
            "id",
            "content",
            "type",
            "senderId",
            "createdAt",
            "replyToId",
          ],
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "firstName", "lastName", "avatar"],
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
      ],
    });

    if (!chat) {
      throw new NotFoundError("Chat not found");
    }

    // Mark messages as read
    await ChatMember.update(
      { lastReadAt: new Date() },
      {
        where: {
          chatId: id,
          userId: req.user.id,
        },
      }
    );

    res.json({
      success: true,
      data: {
        chat,
      },
    });
  })
);

// Send message
router.post(
  "/:id/messages",
  authenticate,
  validate(sendMessageSchema),
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { content, type, replyToId } = req.body;

    // Check if user is member of this chat
    const chatMembership = await ChatMember.findOne({
      where: {
        chatId: id,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!chatMembership) {
      throw new AuthorizationError("You are not a member of this chat");
    }

    // If replyToId is provided, verify it exists and belongs to this chat
    if (replyToId) {
      const replyMessage = await Message.findByPk(replyToId);
      if (!replyMessage || replyMessage.chatId !== id) {
        throw new ValidationError("Invalid reply message");
      }
    }

    // Create message
    const message = await Message.create({
      chatId: id,
      senderId: req.user.id,
      content,
      type,
      replyToId,
    });

    // Update chat's last message time
    await Chat.update({ lastMessageAt: new Date() }, { where: { id } });

    // Load message with sender information
    const createdMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
        {
          model: Message,
          as: "replyTo",
          attributes: ["id", "content", "senderId"],
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
        },
      ],
    });

    logger.info("Message sent successfully", {
      messageId: message.id,
      chatId: id,
      senderId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: {
        message: createdMessage,
      },
    });
  })
);

// Edit message
router.put(
  "/messages/:messageId",
  authenticate,
  catchAsync(async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      throw new ValidationError("Message content is required");
    }

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: Chat,
          as: "chat",
          include: [
            {
              model: User,
              as: "members",
              where: { id: req.user.id },
              through: { where: { isActive: true } },
              attributes: [],
            },
          ],
        },
      ],
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Check if user is member of the chat
    if (!message.chat) {
      throw new AuthorizationError("You are not a member of this chat");
    }

    // Check if user is the sender
    if (message.senderId !== req.user.id) {
      throw new AuthorizationError("You can only edit your own messages");
    }

    // Update message
    await message.update({
      content,
      isEdited: true,
      editedAt: new Date(),
    });

    logger.info("Message edited successfully", {
      messageId,
      senderId: req.user.id,
    });

    res.json({
      success: true,
      message: "Message edited successfully",
      data: {
        message,
      },
    });
  })
);

// Delete message
router.delete(
  "/messages/:messageId",
  authenticate,
  catchAsync(async (req, res) => {
    const { messageId } = req.params;

    const message = await Message.findByPk(messageId, {
      include: [
        {
          model: Chat,
          as: "chat",
          include: [
            {
              model: User,
              as: "members",
              where: { id: req.user.id },
              through: { where: { isActive: true } },
              attributes: [],
            },
          ],
        },
      ],
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // Check if user is member of the chat
    if (!message.chat) {
      throw new AuthorizationError("You are not a member of this chat");
    }

    // Check if user is the sender or has admin/moderator role
    const chatMembership = await ChatMember.findOne({
      where: {
        chatId: message.chatId,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (
      message.senderId !== req.user.id &&
      !["admin", "moderator"].includes(chatMembership.role)
    ) {
      throw new AuthorizationError("You can only delete your own messages");
    }

    // Soft delete message
    await message.update({
      isDeleted: true,
      deletedAt: new Date(),
      content: "This message was deleted",
    });

    logger.info("Message deleted successfully", {
      messageId,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  })
);

// Add member to chat
router.post(
  "/:id/members",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    // Check if user is admin of this chat
    const chatMembership = await ChatMember.findOne({
      where: {
        chatId: id,
        userId: req.user.id,
        isActive: true,
        role: ["admin", "moderator"],
      },
    });

    if (!chatMembership) {
      throw new AuthorizationError(
        "Only admins and moderators can add members"
      );
    }

    // Check if user is already a member
    const existingMembership = await ChatMember.findOne({
      where: {
        chatId: id,
        userId,
        isActive: true,
      },
    });

    if (existingMembership) {
      throw new ValidationError("User is already a member of this chat");
    }

    // Add member
    const newMembership = await ChatMember.create({
      chatId: id,
      userId,
      role: "member",
      joinedAt: new Date(),
    });

    // Load the new member
    const member = await User.findByPk(userId, {
      attributes: ["id", "firstName", "lastName", "avatar"],
    });

    logger.info("Member added to chat", {
      chatId: id,
      userId,
      addedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Member added successfully",
      data: {
        member,
      },
    });
  })
);

// Remove member from chat
router.delete(
  "/:id/members/:userId",
  authenticate,
  catchAsync(async (req, res) => {
    const { id, userId } = req.params;

    // Check if user is admin of this chat or removing themselves
    const chatMembership = await ChatMember.findOne({
      where: {
        chatId: id,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!chatMembership) {
      throw new AuthorizationError("You are not a member of this chat");
    }

    // Can't remove yourself if you're the only admin
    if (userId === req.user.id) {
      const adminCount = await ChatMember.count({
        where: {
          chatId: id,
          role: "admin",
          isActive: true,
        },
      });

      if (adminCount <= 1 && chatMembership.role === "admin") {
        throw new ValidationError("Cannot leave chat as the only admin");
      }
    } else if (!["admin", "moderator"].includes(chatMembership.role)) {
      throw new AuthorizationError(
        "Only admins and moderators can remove members"
      );
    }

    // Remove member
    await ChatMember.update(
      { isActive: false },
      {
        where: {
          chatId: id,
          userId,
        },
      }
    );

    logger.info("Member removed from chat", {
      chatId: id,
      userId,
      removedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Member removed successfully",
    });
  })
);

// Leave chat
router.post(
  "/:id/leave",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const chatMembership = await ChatMember.findOne({
      where: {
        chatId: id,
        userId: req.user.id,
        isActive: true,
      },
    });

    if (!chatMembership) {
      throw new AuthorizationError("You are not a member of this chat");
    }

    // Can't leave if you're the only admin
    if (chatMembership.role === "admin") {
      const adminCount = await ChatMember.count({
        where: {
          chatId: id,
          role: "admin",
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new ValidationError("Cannot leave chat as the only admin");
      }
    }

    // Leave chat
    await ChatMember.update(
      { isActive: false },
      {
        where: {
          chatId: id,
          userId: req.user.id,
        },
      }
    );

    logger.info("User left chat", { chatId: id, userId: req.user.id });

    res.json({
      success: true,
      message: "Left chat successfully",
    });
  })
);

export default router;
