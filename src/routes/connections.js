import express from "express";
import { Op } from "sequelize";
import { Connection, User, Notification } from "../models/index.js";
import { authenticate } from "../middleware/auth.js";
import {
  validate,
  sendConnectionRequestSchema,
} from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { sendEmail } from "../utils/email.js";

const router = express.Router();

// Send connection request
router.post(
  "/send",
  authenticate,
  validate(sendConnectionRequestSchema),
  catchAsync(async (req, res) => {
    const { addresseeId, message } = req.body;
    const requesterId = req.user.id;

    // Check if user is trying to connect with themselves
    if (requesterId === addresseeId) {
      throw new ValidationError(
        "You cannot send a connection request to yourself"
      );
    }

    // Check if addressee exists
    logger.info("Looking for addressee", { addresseeId, requesterId });
    const addressee = await User.findByPk(addresseeId);
    logger.info("Addressee found", {
      addressee: addressee
        ? { id: addressee.id, isActive: addressee.isActive }
        : null,
    });
    if (!addressee || !addressee.isActive) {
      throw new NotFoundError("User not found");
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      where: {
        [Op.or]: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existingConnection) {
      throw new ConflictError(
        "Connection request already exists or users are already connected"
      );
    }

    // Create connection request
    const connection = await Connection.create({
      requesterId,
      addresseeId,
      message: message || null,
      status: "pending",
    });

    // Create notification for the addressee
    await Notification.create({
      userId: addresseeId,
      type: "connection_request",
      title: "New Connection Request",
      message: `${req.user.getFullName()} sent you a connection request${
        message ? `: "${message}"` : ""
      }`,
      data: {
        requesterId,
        requesterName: req.user.getFullName(),
        connectionId: connection.id,
      },
      relatedUserId: requesterId,
      relatedConnectionId: connection.id,
      priority: "medium",
    });

    // Send notification email to addressee
    try {
      await sendEmail({
        email: addressee.email,
        subject: "New Connection Request on Georgia Connects Hub",
        template: "connectionRequest",
        data: {
          recipientName: addressee.getFullName(),
          requesterName: req.user.getFullName(),
          message: message || "",
          connectionUrl: `${process.env.FRONTEND_URL}/connections`,
        },
      });
    } catch (emailError) {
      logger.error("Failed to send connection request email:", emailError);
      // Don't fail the request if email fails
    }

    logger.info("Connection request sent", {
      requesterId,
      addresseeId,
      connectionId: connection.id,
    });

    res.status(201).json({
      success: true,
      message: "Connection request sent successfully",
      data: {
        connection,
      },
    });
  })
);

// Get connection requests (received)
router.get(
  "/requests/received",
  authenticate,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: connections } = await Connection.findAndCountAll({
      where: {
        addresseeId: req.user.id,
        status: "pending",
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
            "location",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        requests: connections,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalRequests: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get connection requests (sent)
router.get(
  "/requests/sent",
  authenticate,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: connections } = await Connection.findAndCountAll({
      where: {
        requesterId: req.user.id,
        status: "pending",
      },
      include: [
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
            "location",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        requests: connections,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalRequests: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Accept connection request
router.post(
  "/:id/accept",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const connection = await Connection.findByPk(id, {
      include: [
        {
          model: User,
          as: "requester",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: User,
          as: "addressee",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    if (!connection) {
      throw new NotFoundError("Connection request not found");
    }

    // Check if user is the addressee
    if (connection.addresseeId !== req.user.id) {
      throw new ValidationError(
        "You can only accept connection requests sent to you"
      );
    }

    // Check if request is still pending
    if (connection.status !== "pending") {
      throw new ValidationError(
        "This connection request has already been processed"
      );
    }

    // Accept the connection
    await connection.update({
      status: "accepted",
      acceptedAt: new Date(),
    });

    // Create notification for the requester
    await Notification.create({
      userId: connection.requesterId,
      type: "connection_accepted",
      title: "Connection Request Accepted",
      message: `${connection.addressee.getFullName()} accepted your connection request`,
      data: {
        accepterId: connection.addresseeId,
        accepterName: connection.addressee.getFullName(),
        connectionId: connection.id,
      },
      relatedUserId: connection.addresseeId,
      relatedConnectionId: connection.id,
      priority: "medium",
    });

    // Send notification email to requester
    try {
      await sendEmail({
        email: connection.requester.email,
        subject: "Connection Request Accepted",
        template: "connectionAccepted",
        data: {
          requesterName: connection.requester.getFullName(),
          accepterName: connection.addressee.getFullName(),
          profileUrl: `${process.env.FRONTEND_URL}/profile/${connection.addresseeId}`,
        },
      });
    } catch (emailError) {
      logger.error("Failed to send connection accepted email:", emailError);
    }

    logger.info("Connection request accepted", {
      connectionId: id,
      requesterId: connection.requesterId,
      addresseeId: connection.addresseeId,
    });

    res.json({
      success: true,
      message: "Connection request accepted successfully",
      data: {
        connection,
      },
    });
  })
);

// Reject connection request
router.post(
  "/:id/reject",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const connection = await Connection.findByPk(id);

    if (!connection) {
      throw new NotFoundError("Connection request not found");
    }

    // Check if user is the addressee
    if (connection.addresseeId !== req.user.id) {
      throw new ValidationError(
        "You can only reject connection requests sent to you"
      );
    }

    // Check if request is still pending
    if (connection.status !== "pending") {
      throw new ValidationError(
        "This connection request has already been processed"
      );
    }

    // Reject the connection
    await connection.update({
      status: "rejected",
      rejectedAt: new Date(),
    });

    logger.info("Connection request rejected", {
      connectionId: id,
      requesterId: connection.requesterId,
      addresseeId: connection.addresseeId,
    });

    res.json({
      success: true,
      message: "Connection request rejected successfully",
    });
  })
);

// Remove connection
router.delete(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const connection = await Connection.findByPk(id);

    if (!connection) {
      throw new NotFoundError("Connection not found");
    }

    // Check if user is part of this connection
    if (
      connection.requesterId !== req.user.id &&
      connection.addresseeId !== req.user.id
    ) {
      throw new ValidationError(
        "You can only remove connections you are part of"
      );
    }

    // Check if connection is accepted
    if (connection.status !== "accepted") {
      throw new ValidationError("Only accepted connections can be removed");
    }

    // Delete the connection
    await connection.destroy();

    logger.info("Connection removed", {
      connectionId: id,
      requesterId: connection.requesterId,
      addresseeId: connection.addresseeId,
    });

    res.json({
      success: true,
      message: "Connection removed successfully",
    });
  })
);

// Get connections (accepted)
router.get(
  "/",
  authenticate,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {
      [Op.or]: [{ requesterId: req.user.id }, { addresseeId: req.user.id }],
      status: "accepted",
    };

    const { count, rows: connections } = await Connection.findAndCountAll({
      where: whereClause,
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
            "location",
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
            "location",
          ],
        },
      ],
      order: [["acceptedAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Format connections to show the other user and filter by search if provided
    let formattedConnections = connections.map((connection) => {
      const otherUser =
        connection.requesterId === req.user.id
          ? connection.addressee
          : connection.requester;
      return {
        id: connection.id,
        user: otherUser,
        connectedAt: connection.acceptedAt,
      };
    });

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      formattedConnections = formattedConnections.filter(
        (connection) =>
          connection.user.firstName.toLowerCase().includes(searchLower) ||
          connection.user.lastName.toLowerCase().includes(searchLower) ||
          connection.user.company?.toLowerCase().includes(searchLower) ||
          connection.user.jobTitle?.toLowerCase().includes(searchLower)
      );
    }

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

// Get connection status between two users
router.get(
  "/status/:userId",
  authenticate,
  catchAsync(async (req, res) => {
    const { userId } = req.params;

    if (req.user.id === userId) {
      return res.json({
        success: true,
        data: {
          status: "self",
        },
      });
    }

    const connection = await Connection.findOne({
      where: {
        [Op.or]: [
          { requesterId: req.user.id, addresseeId: userId },
          { requesterId: userId, addresseeId: req.user.id },
        ],
      },
    });

    res.json({
      success: true,
      data: {
        status: connection ? connection.status : "none",
      },
    });
  })
);

// Get mutual connections
router.get(
  "/mutual/:userId",
  authenticate,
  catchAsync(async (req, res) => {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get user's connections
    const userConnections = await Connection.findAll({
      where: {
        [Op.or]: [{ requesterId: req.user.id }, { addresseeId: req.user.id }],
        status: "accepted",
      },
      attributes: ["requesterId", "addresseeId"],
    });

    // Get other user's connections
    const otherUserConnections = await Connection.findAll({
      where: {
        [Op.or]: [{ requesterId: userId }, { addresseeId: userId }],
        status: "accepted",
      },
      attributes: ["requesterId", "addresseeId"],
    });

    // Find mutual connections
    const userConnectionIds = new Set();
    userConnections.forEach((conn) => {
      if (conn.requesterId === req.user.id) {
        userConnectionIds.add(conn.addresseeId);
      } else {
        userConnectionIds.add(conn.requesterId);
      }
    });

    const otherUserConnectionIds = new Set();
    otherUserConnections.forEach((conn) => {
      if (conn.requesterId === userId) {
        otherUserConnectionIds.add(conn.addresseeId);
      } else {
        otherUserConnectionIds.add(conn.requesterId);
      }
    });

    const mutualIds = [...userConnectionIds].filter(
      (id) => otherUserConnectionIds.has(id) && id !== userId
    );

    // Get mutual connections details
    const { count, rows: mutualConnections } = await User.findAndCountAll({
      where: {
        id: {
          [Op.in]: mutualIds,
        },
      },
      attributes: [
        "id",
        "firstName",
        "lastName",
        "avatar",
        "company",
        "jobTitle",
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        connections: mutualConnections,
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

export default router;
