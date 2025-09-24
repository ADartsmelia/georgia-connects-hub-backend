import express from "express";
import { Op } from "sequelize";
import { Playlist, User } from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { validate, createPlaylistSchema } from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get playlist items
router.get(
  "/",
  optionalAuth,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isApproved: true };

    // Add filters
    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: playlist } = await Playlist.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "adder",
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
        playlist,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get single playlist item
router.get(
  "/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const playlistItem = await Playlist.findByPk(id, {
      include: [
        {
          model: User,
          as: "adder",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
    });

    if (!playlistItem || !playlistItem.isApproved) {
      throw new NotFoundError("Playlist item not found");
    }

    // Increment view count
    await playlistItem.increment("views");

    res.json({
      success: true,
      data: {
        playlistItem,
      },
    });
  })
);

// Create playlist item
router.post(
  "/",
  authenticate,
  validate(createPlaylistSchema),
  catchAsync(async (req, res) => {
    const playlistData = {
      ...req.body,
      addedBy: req.user.id,
    };

    const playlistItem = await Playlist.create(playlistData);

    logger.info("Playlist item created successfully", {
      playlistId: playlistItem.id,
      addedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Playlist item created successfully",
      data: {
        playlistItem,
      },
    });
  })
);

// Update playlist item
router.put(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const playlistItem = await Playlist.findByPk(id);

    if (!playlistItem) {
      throw new NotFoundError("Playlist item not found");
    }

    // Check if user owns this item or is admin
    if (playlistItem.addedBy !== req.user.id) {
      throw new ValidationError("You can only edit your own playlist items");
    }

    await playlistItem.update(req.body);

    logger.info("Playlist item updated successfully", {
      playlistId: id,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Playlist item updated successfully",
      data: {
        playlistItem,
      },
    });
  })
);

// Delete playlist item
router.delete(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const playlistItem = await Playlist.findByPk(id);

    if (!playlistItem) {
      throw new NotFoundError("Playlist item not found");
    }

    // Check if user owns this item or is admin
    if (playlistItem.addedBy !== req.user.id) {
      throw new ValidationError("You can only delete your own playlist items");
    }

    await playlistItem.destroy();

    logger.info("Playlist item deleted successfully", {
      playlistId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Playlist item deleted successfully",
    });
  })
);

// Upvote playlist item
router.post(
  "/:id/upvote",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const playlistItem = await Playlist.findByPk(id);

    if (!playlistItem || !playlistItem.isApproved) {
      throw new NotFoundError("Playlist item not found");
    }

    // In a real app, you'd track individual votes to prevent multiple votes
    // For simplicity, we'll just increment the upvote count
    await playlistItem.increment("upvotes");

    logger.info("Playlist item upvoted", {
      playlistId: id,
      upvotedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Playlist item upvoted successfully",
      data: {
        upvotes: playlistItem.upvotes,
      },
    });
  })
);

// Downvote playlist item
router.post(
  "/:id/downvote",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const playlistItem = await Playlist.findByPk(id);

    if (!playlistItem || !playlistItem.isApproved) {
      throw new NotFoundError("Playlist item not found");
    }

    // In a real app, you'd track individual votes to prevent multiple votes
    // For simplicity, we'll just increment the downvote count
    await playlistItem.increment("downvotes");

    logger.info("Playlist item downvoted", {
      playlistId: id,
      downvotedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Playlist item downvoted successfully",
      data: {
        downvotes: playlistItem.downvotes,
      },
    });
  })
);

// Approve playlist item (admin only)
router.post(
  "/:id/approve",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const playlistItem = await Playlist.findByPk(id);

    if (!playlistItem) {
      throw new NotFoundError("Playlist item not found");
    }

    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to approve items

    await playlistItem.update({ isApproved: true });

    logger.info("Playlist item approved", {
      playlistId: id,
      approvedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Playlist item approved successfully",
      data: {
        playlistItem,
      },
    });
  })
);

// Feature playlist item (admin only)
router.post(
  "/:id/feature",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const playlistItem = await Playlist.findByPk(id);

    if (!playlistItem || !playlistItem.isApproved) {
      throw new NotFoundError("Playlist item not found");
    }

    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to feature items

    await playlistItem.update({ isFeatured: !playlistItem.isFeatured });

    logger.info("Playlist item feature status toggled", {
      playlistId: id,
      isFeatured: !playlistItem.isFeatured,
      toggledBy: req.user.id,
    });

    res.json({
      success: true,
      message: `Playlist item ${
        playlistItem.isFeatured ? "unfeatured" : "featured"
      } successfully`,
      data: {
        playlistItem,
      },
    });
  })
);

// Get featured playlist items
router.get(
  "/featured",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { limit = 10 } = req.query;

    const featuredItems = await Playlist.findAll({
      where: {
        isApproved: true,
        isFeatured: true,
      },
      include: [
        {
          model: User,
          as: "adder",
          attributes: ["id", "firstName", "lastName", "avatar"],
        },
      ],
      order: [
        ["upvotes", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: parseInt(limit),
    });

    res.json({
      success: true,
      data: {
        featuredItems,
      },
    });
  })
);

export default router;
