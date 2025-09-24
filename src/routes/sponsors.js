import express from "express";
import { Op } from "sequelize";
import { Sponsor, Offer } from "../models/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import {
  validate,
  createSponsorSchema,
  createOfferSchema,
} from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// Get sponsors
router.get(
  "/",
  optionalAuth,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      location,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true };

    // Add filters
    if (category) {
      whereClause.category = category;
    }

    if (location) {
      whereClause.location = { [Op.iLike]: `%${location}%` };
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: sponsors } = await Sponsor.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Offer,
          as: "offers",
          where: {
            isActive: true,
            validFrom: { [Op.lte]: new Date() },
            validUntil: { [Op.gte]: new Date() },
          },
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        sponsors,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalSponsors: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Get single sponsor
router.get(
  "/:id",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const sponsor = await Sponsor.findByPk(id, {
      include: [
        {
          model: Offer,
          as: "offers",
          where: { isActive: true },
          required: false,
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    if (!sponsor || !sponsor.isActive) {
      throw new NotFoundError("Sponsor not found");
    }

    res.json({
      success: true,
      data: {
        sponsor,
      },
    });
  })
);

// Create sponsor (admin only)
router.post(
  "/",
  authenticate,
  validate(createSponsorSchema),
  catchAsync(async (req, res) => {
    // In a real app, you'd check if user is admin
    // For now, we'll allow any authenticated user to create sponsors

    const sponsor = await Sponsor.create(req.body);

    logger.info("Sponsor created successfully", {
      sponsorId: sponsor.id,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Sponsor created successfully",
      data: {
        sponsor,
      },
    });
  })
);

// Update sponsor
router.put(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const sponsor = await Sponsor.findByPk(id);

    if (!sponsor) {
      throw new NotFoundError("Sponsor not found");
    }

    // In a real app, you'd check if user is admin or owns the sponsor
    // For now, we'll allow any authenticated user to update

    await sponsor.update(req.body);

    logger.info("Sponsor updated successfully", {
      sponsorId: id,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Sponsor updated successfully",
      data: {
        sponsor,
      },
    });
  })
);

// Delete sponsor
router.delete(
  "/:id",
  authenticate,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const sponsor = await Sponsor.findByPk(id);

    if (!sponsor) {
      throw new NotFoundError("Sponsor not found");
    }

    // In a real app, you'd check if user is admin or owns the sponsor
    // For now, we'll allow any authenticated user to delete

    await sponsor.update({ isActive: false });

    logger.info("Sponsor deactivated successfully", {
      sponsorId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Sponsor deactivated successfully",
    });
  })
);

// Get sponsor offers
router.get(
  "/:id/offers",
  optionalAuth,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20, category } = req.query;
    const offset = (page - 1) * limit;

    const sponsor = await Sponsor.findByPk(id);

    if (!sponsor || !sponsor.isActive) {
      throw new NotFoundError("Sponsor not found");
    }

    const whereClause = {
      sponsorId: id,
      isActive: true,
      validFrom: { [Op.lte]: new Date() },
      validUntil: { [Op.gte]: new Date() },
    };

    if (category) {
      whereClause.category = category;
    }

    const { count, rows: offers } = await Offer.findAndCountAll({
      where: whereClause,
      order: [
        ["isFeatured", "DESC"],
        ["createdAt", "DESC"],
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        offers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalOffers: count,
          hasNext: page * limit < count,
          hasPrev: page > 1,
        },
      },
    });
  })
);

// Create offer for sponsor
router.post(
  "/:id/offers",
  authenticate,
  validate(createOfferSchema),
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const sponsor = await Sponsor.findByPk(id);

    if (!sponsor || !sponsor.isActive) {
      throw new NotFoundError("Sponsor not found");
    }

    // In a real app, you'd check if user is admin or owns the sponsor
    // For now, we'll allow any authenticated user to create offers

    const offer = await Offer.create({
      ...req.body,
      sponsorId: id,
    });

    // Update sponsor's offer count
    await sponsor.increment("totalOffers");

    logger.info("Offer created successfully", {
      offerId: offer.id,
      sponsorId: id,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Offer created successfully",
      data: {
        offer,
      },
    });
  })
);

export default router;
