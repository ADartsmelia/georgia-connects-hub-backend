import express from "express";
import { Op } from "sequelize";
import { Media } from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { validate, createMediaSchema } from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get media
router.get(
  "/",
  optionalAuth,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isPublic: true };

    // Add filters
    if (type) {
      whereClause.type = type;
    }

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { speakers: { [Op.contains]: [search] } },
        { tags: { [Op.contains]: [search] } },
      ];
    }

    const { count, rows: media } = await Media.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        media,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalMedia: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get single media item
router.get(
  "/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const media = await Media.findByPk(id);

    if (!media || !media.isPublic) {
      throw new NotFoundError("Media not found");
    }

    // Increment view count
    await media.increment("views");

    res.json({
      success: true,
      data: {
        media,
      },
    });
  })
);

// Create media
router.post(
  "/",
  authenticate,
  validate(createMediaSchema),
  catchAsync(async (req, res) => {
    const mediaData = {
      ...req.body,
      uploaderId: req.user.id,
    };

    const media = await Media.create(mediaData);

    logger.info("Media created successfully", {
      mediaId: media.id,
      uploaderId: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Media created successfully",
      data: {
        media,
      },
    });
  })
);

// Update media
router.put(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const media = await Media.findByPk(id);

    if (!media) {
      throw new NotFoundError("Media not found");
    }

    // Check if user owns this media or is admin
    if (media.uploaderId !== req.user.id) {
      throw new ValidationError("You can only edit your own media");
    }

    await media.update(req.body);

    logger.info("Media updated successfully", {
      mediaId: id,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Media updated successfully",
      data: {
        media,
      },
    });
  })
);

// Delete media
router.delete(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const media = await Media.findByPk(id);

    if (!media) {
      throw new NotFoundError("Media not found");
    }

    // Check if user owns this media or is admin
    if (media.uploaderId !== req.user.id) {
      throw new ValidationError("You can only delete your own media");
    }

    await media.destroy();

    logger.info("Media deleted successfully", {
      mediaId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Media deleted successfully",
    });
  })
);

// Like/Unlike media
router.post(
  "/:id/like",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'like' or 'unlike'

    const media = await Media.findByPk(id);

    if (!media || !media.isPublic) {
      throw new NotFoundError("Media not found");
    }

    if (action === "like") {
      await media.increment("likes");
    } else if (action === "unlike") {
      await media.decrement("likes");
    } else {
      throw new ValidationError('Action must be either "like" or "unlike"');
    }

    res.json({
      success: true,
      message: `Media ${action}d successfully`,
      data: {
        likes: media.likes,
      },
    });
  })
);

// Save/Unsave media
router.post(
  "/:id/save",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'save' or 'unsave'

    const media = await Media.findByPk(id);

    if (!media || !media.isPublic) {
      throw new NotFoundError("Media not found");
    }

    if (action === "save") {
      await media.increment("saves");
    } else if (action === "unsave") {
      await media.decrement("saves");
    } else {
      throw new ValidationError('Action must be either "save" or "unsave"');
    }

    res.json({
      success: true,
      message: `Media ${action}d successfully`,
      data: {
        saves: media.saves,
      },
    });
  })
);

// Share media
router.post(
  "/:id/share",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const media = await Media.findByPk(id);

    if (!media || !media.isPublic) {
      throw new NotFoundError("Media not found");
    }

    // Increment share count
    await media.increment("shares");

    logger.info("Media shared", { mediaId: id, sharedBy: req.user.id });

    res.json({
      success: true,
      message: "Media shared successfully",
      data: {
        shares: media.shares,
      },
    });
  })
);

export default router;
