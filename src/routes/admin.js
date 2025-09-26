import express from "express";
import { Op } from "sequelize";
import { sequelize } from "../database/connection.js";
import {
  User,
  Post,
  Sponsor,
  SponsorPass,
  Agenda,
  AgendaCheckIn,
  Connection,
  Chat,
  Message,
  Badge,
  UserBadge,
} from "../models/index.js";
import {
  authenticate,
  generateToken,
  generateRefreshToken,
} from "../middleware/auth.js";
import {
  requireAdmin,
  requireSuperAdmin,
  canManageUsers,
  canApprovePosts,
  canManageSponsors,
} from "../middleware/adminAuth.js";
import {
  validate,
  updateUserTypeSchema,
  approvePostSchema,
  createSponsorPassSchema,
  loginSchema,
  createBadgeSchema,
  updateBadgeSchema,
  assignBadgeSchema,
} from "../middleware/validation.js";
import {
  catchAsync,
  NotFoundError,
  ValidationError,
  AuthorizationError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

const router = express.Router();

// ==================== ADMIN LOGIN ROUTE ====================
// This route must be BEFORE the authenticate middleware
router.post(
  "/login",
  validate(loginSchema),
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      throw new AuthorizationError("Invalid email or password");
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthorizationError("Invalid email or password");
    }

    if (!user.isAdmin && !user.isSuperAdmin) {
      throw new AuthorizationError("Admin access required");
    }

    if (!user.isActive) {
      throw new AuthorizationError("Account is deactivated");
    }

    user.lastLogin = new Date();
    user.lastActivityDate = new Date();
    await user.save();

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    user.refreshToken = refreshToken;
    await user.save();

    logger.info("Admin login successful", {
      userId: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    });

    res.json({
      success: true,
      message: "Admin login successful",
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
      },
    });
  })
);

// Apply authentication middleware to all other routes
router.use(authenticate);

// ==================== DASHBOARD STATS ROUTES ====================

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get(
  "/dashboard/stats",
  requireAdmin,
  catchAsync(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      totalPosts,
      pendingPosts,
      totalSponsors,
      totalConnections,
      totalChats,
      totalMessages,
      checkInStats,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      Post.count(),
      Post.count({ where: { approvalStatus: "pending" } }),
      Sponsor.count(),
      Connection.count(),
      Chat.count(),
      Message.count(),
      AgendaCheckIn.findAll({
        attributes: [
          [sequelize.fn("COUNT", sequelize.col("id")), "totalCheckIns"],
          [
            sequelize.fn(
              "COUNT",
              sequelize.fn("DISTINCT", sequelize.col("userId"))
            ),
            "uniqueUsers",
          ],
        ],
        raw: true,
      }),
    ]);

    const usersByType = await User.findAll({
      attributes: [
        "userType",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["userType"],
      raw: true,
    });

    const usersByPassType = await User.findAll({
      attributes: [
        "passType",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["passType"],
      raw: true,
    });

    const recentUsers = await User.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      attributes: [
        "id",
        "firstName",
        "lastName",
        "email",
        "userType",
        "createdAt",
      ],
    });

    const recentPosts = await Post.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
      attributes: ["id", "content", "approvalStatus", "createdAt"],
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalPosts,
          pendingPosts,
          totalSponsors,
          totalConnections,
          totalChats,
          totalMessages,
          totalCheckIns: checkInStats[0]?.totalCheckIns || 0,
          uniqueCheckInUsers: checkInStats[0]?.uniqueUsers || 0,
        },
        usersByType,
        usersByPassType,
        recentUsers,
        recentPosts,
      },
    });
  })
);

// ==================== USER MANAGEMENT ROUTES ====================

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: userType
 *         schema:
 *           type: string
 *           enum: [unassigned, attendee, speaker, sponsor, volunteer, organizer, admin]
 *       - in: query
 *         name: passType
 *         schema:
 *           type: string
 *           enum: [day_pass, full_pass, none]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 */
router.get(
  "/users",
  canManageUsers,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      userType,
      passType,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (userType) where.userType = userType;
    if (passType) where.passType = passType;
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: SponsorPass,
          as: "sponsorPasses",
          include: [
            {
              model: Sponsor,
              as: "sponsor",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      attributes: {
        exclude: ["password", "refreshToken"],
      },
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
        },
      },
    });
  })
);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 */
router.get(
  "/users/:id",
  canManageUsers,
  catchAsync(async (req, res) => {
    const user = await User.findByPk(req.params.id, {
      include: [
        {
          model: Post,
          as: "posts",
          attributes: ["id", "title", "approvalStatus", "createdAt"],
        },
        {
          model: Connection,
          as: "connections",
          attributes: ["id", "status", "createdAt"],
        },
        {
          model: SponsorPass,
          as: "sponsorPasses",
          include: [
            {
              model: Sponsor,
              as: "sponsor",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: UserBadge,
          as: "userBadges",
          include: [
            {
              model: Badge,
              as: "badge",
              attributes: ["id", "name", "category", "rarity"],
            },
          ],
        },
      ],
      attributes: {
        exclude: ["password", "refreshToken"],
      },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.json({
      success: true,
      data: { user },
    });
  })
);

/**
 * @swagger
 * /admin/users/{id}/type:
 *   put:
 *     summary: Update user type and pass type
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userType
 *             properties:
 *               userType:
 *                 type: string
 *                 enum: [attendee, speaker, sponsor, volunteer, organizer, admin]
 *               passType:
 *                 type: string
 *                 enum: [day_pass, full_pass, none]
 *               adminNotes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: User type updated successfully
 *       404:
 *         description: User not found
 */
router.put(
  "/users/:id/type",
  canManageUsers,
  validate(updateUserTypeSchema),
  catchAsync(async (req, res) => {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const { userType, passType, adminNotes } = req.body;

    await user.update({
      userType,
      passType: passType || user.passType,
      adminNotes: adminNotes || user.adminNotes,
      assignedBy: req.user.id,
      assignedAt: new Date(),
    });

    logger.info("User type updated", {
      userId: user.id,
      newUserType: userType,
      newPassType: passType,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "User type updated successfully",
      data: { user },
    });
  })
);

// ==================== POST APPROVAL ROUTES ====================

/**
 * @swagger
 * /admin/posts:
 *   get:
 *     summary: Get all posts with approval status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: approvalStatus
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 */
router.get(
  "/posts",
  canApprovePosts,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      approvalStatus,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (approvalStatus) {
      where.approvalStatus = approvalStatus;
    }

    const { count, rows: posts } = await Post.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: User,
          as: "approver",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
        },
      },
    });
  })
);

/**
 * @swagger
 * /admin/posts/{id}/approve:
 *   put:
 *     summary: Approve or reject a post
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *               rejectionReason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Post approval status updated successfully
 *       404:
 *         description: Post not found
 */
router.put(
  "/posts/:id/approve",
  canApprovePosts,
  validate(approvePostSchema),
  catchAsync(async (req, res) => {
    const post = await Post.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "firstName", "lastName", "email"],
        },
      ],
    });

    if (!post) {
      throw new NotFoundError("Post not found");
    }

    const { action, rejectionReason } = req.body;

    const updateData = {
      approvalStatus: action === "approve" ? "approved" : "rejected",
      approvedBy: req.user.id,
      approvedAt: new Date(),
    };

    if (action === "reject" && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    await post.update(updateData);

    logger.info("Post approval status updated", {
      postId: post.id,
      action,
      approvedBy: req.user.id,
      authorId: post.author.id,
    });

    res.json({
      success: true,
      message: `Post ${action}d successfully`,
      data: { post },
    });
  })
);

// ==================== SPONSOR MANAGEMENT ROUTES ====================

/**
 * @swagger
 * /admin/sponsors:
 *   get:
 *     summary: Get all sponsors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sponsors retrieved successfully
 */
router.get(
  "/sponsors",
  canManageSponsors,
  catchAsync(async (req, res) => {
    const sponsors = await Sponsor.findAll({
      include: [
        {
          model: SponsorPass,
          as: "sponsorPasses",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "email"],
            },
          ],
        },
      ],
    });

    res.json({
      success: true,
      data: { sponsors },
    });
  })
);

/**
 * @swagger
 * /admin/sponsors/passes:
 *   post:
 *     summary: Create sponsor pass for user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - sponsorId
 *               - passType
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               sponsorId:
 *                 type: string
 *                 format: uuid
 *               passType:
 *                 type: string
 *                 enum: [day_pass, full_pass]
 *               dayNumber:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 7
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Sponsor pass created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/sponsors/passes",
  canManageSponsors,
  validate(createSponsorPassSchema),
  catchAsync(async (req, res) => {
    const { userId, sponsorId, passType, dayNumber, notes } = req.body;

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if sponsor exists
    const sponsor = await Sponsor.findByPk(sponsorId);
    if (!sponsor) {
      throw new NotFoundError("Sponsor not found");
    }

    // Check if pass already exists
    const existingPass = await SponsorPass.findOne({
      where: { userId, sponsorId },
    });

    if (existingPass) {
      throw new ValidationError("User already has a pass for this sponsor");
    }

    const sponsorPass = await SponsorPass.create({
      userId,
      sponsorId,
      passType,
      dayNumber: passType === "day_pass" ? dayNumber : null,
      issuedBy: req.user.id,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true,
      notes,
    });

    logger.info("Sponsor pass created", {
      sponsorPassId: sponsorPass.id,
      userId,
      sponsorId,
      passType,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Sponsor pass created successfully",
      data: { sponsorPass },
    });
  })
);

// ==================== CHECK-IN ANALYTICS ROUTES ====================

/**
 * @swagger
 * /admin/checkins/analytics:
 *   get:
 *     summary: Get check-in analytics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Check-in analytics retrieved successfully
 */
router.get(
  "/checkins/analytics",
  requireAdmin,
  catchAsync(async (req, res) => {
    const checkInStats = await AgendaCheckIn.findAll({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalCheckIns"],
        [
          sequelize.fn(
            "COUNT",
            sequelize.fn("DISTINCT", sequelize.col("userId"))
          ),
          "uniqueUsers",
        ],
      ],
      raw: true,
    });

    const checkInsByDay = await AgendaCheckIn.findAll({
      attributes: [
        [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
      raw: true,
    });

    const totalUniqueUsers = await User.count({
      where: { isActive: true },
    });

    res.json({
      success: true,
      data: {
        checkInStats,
        totalUniqueUsers,
        checkInsByDay,
      },
    });
  })
);

// Get all check-ins with user and agenda details
router.get(
  "/checkins",
  authenticate,
  requireAdmin,
  catchAsync(async (req, res) => {
    const { page = 1, limit = 20, day, agendaId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (day) whereClause.day = day;
    if (agendaId) whereClause.agendaId = agendaId;

    const checkIns = await AgendaCheckIn.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName", "avatar"],
        },
        {
          model: Agenda,
          as: "agenda",
          attributes: ["id", "day", "time", "title", "requiresCheckIn"],
        },
      ],
      order: [["checkedInAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: {
        checkIns: checkIns.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(checkIns.count / limit),
          totalItems: checkIns.count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  })
);

// ==================== BADGE MANAGEMENT ROUTES ====================

/**
 * @swagger
 * /admin/badges:
 *   get:
 *     summary: Get all badges with filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Networking, Knowledge, Engagement, Special]
 *       - in: query
 *         name: rarity
 *         schema:
 *           type: string
 *           enum: [Common, Rare, Epic, Legendary]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Badges retrieved successfully
 */
router.get(
  "/badges",
  requireSuperAdmin,
  catchAsync(async (req, res) => {
    const {
      page = 1,
      limit = 20,
      category,
      rarity,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (category) where.category = category;
    if (rarity) where.rarity = rarity;
    if (isActive !== undefined) where.isActive = isActive === "true";
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: badges } = await Badge.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
    });

    res.json({
      success: true,
      data: {
        badges,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
        },
      },
    });
  })
);

/**
 * @swagger
 * /admin/badges:
 *   post:
 *     summary: Create a new badge
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - icon
 *               - category
 *               - requirements
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: uri
 *               category:
 *                 type: string
 *                 enum: [Networking, Knowledge, Engagement, Special]
 *               rarity:
 *                 type: string
 *                 enum: [Common, Rare, Epic, Legendary]
 *                 default: Common
 *               requirements:
 *                 type: object
 *               points:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               metadata:
 *                 type: object
 *                 default: {}
 *     responses:
 *       201:
 *         description: Badge created successfully
 *       400:
 *         description: Validation error
 */
router.post(
  "/badges",
  requireSuperAdmin,
  validate(createBadgeSchema),
  catchAsync(async (req, res) => {
    const badge = await Badge.create(req.body);

    logger.info("Badge created", {
      badgeId: badge.id,
      name: badge.name,
      category: badge.category,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Badge created successfully",
      data: { badge },
    });
  })
);

/**
 * @swagger
 * /admin/badges/{id}:
 *   get:
 *     summary: Get badge by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Badge retrieved successfully
 *       404:
 *         description: Badge not found
 */
router.get(
  "/badges/:id",
  requireSuperAdmin,
  catchAsync(async (req, res) => {
    const badge = await Badge.findByPk(req.params.id);

    if (!badge) {
      throw new NotFoundError("Badge not found");
    }

    res.json({
      success: true,
      data: { badge },
    });
  })
);

/**
 * @swagger
 * /admin/badges/{id}:
 *   put:
 *     summary: Update badge
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *                 format: uri
 *               category:
 *                 type: string
 *                 enum: [Networking, Knowledge, Engagement, Special]
 *               rarity:
 *                 type: string
 *                 enum: [Common, Rare, Epic, Legendary]
 *               requirements:
 *                 type: object
 *               points:
 *                 type: integer
 *                 minimum: 0
 *               isActive:
 *                 type: boolean
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Badge updated successfully
 *       404:
 *         description: Badge not found
 */
router.put(
  "/badges/:id",
  requireSuperAdmin,
  validate(updateBadgeSchema),
  catchAsync(async (req, res) => {
    const badge = await Badge.findByPk(req.params.id);

    if (!badge) {
      throw new NotFoundError("Badge not found");
    }

    await badge.update(req.body);

    logger.info("Badge updated", {
      badgeId: badge.id,
      name: badge.name,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Badge updated successfully",
      data: { badge },
    });
  })
);

/**
 * @swagger
 * /admin/badges/{id}:
 *   delete:
 *     summary: Delete badge
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Badge deleted successfully
 *       404:
 *         description: Badge not found
 */
router.delete(
  "/badges/:id",
  requireSuperAdmin,
  catchAsync(async (req, res) => {
    const badge = await Badge.findByPk(req.params.id);

    if (!badge) {
      throw new NotFoundError("Badge not found");
    }

    // Check if badge is assigned to any users
    const userBadgeCount = await UserBadge.count({
      where: { badgeId: badge.id },
    });

    if (userBadgeCount > 0) {
      throw new ValidationError(
        `Cannot delete badge. It is assigned to ${userBadgeCount} user(s). Please remove assignments first.`
      );
    }

    await badge.destroy();

    logger.info("Badge deleted", {
      badgeId: badge.id,
      name: badge.name,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Badge deleted successfully",
    });
  })
);

/**
 * @swagger
 * /admin/badges/assign:
 *   post:
 *     summary: Assign badge to user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - badgeId
 *               - maxProgress
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *               badgeId:
 *                 type: string
 *                 format: uuid
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               maxProgress:
 *                 type: integer
 *                 minimum: 1
 *               isEarned:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Badge assigned successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: User or badge not found
 */
router.post(
  "/badges/assign",
  requireSuperAdmin,
  validate(assignBadgeSchema),
  catchAsync(async (req, res) => {
    const {
      userId,
      badgeId,
      progress = 0,
      maxProgress,
      isEarned = false,
    } = req.body;

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Check if badge exists
    const badge = await Badge.findByPk(badgeId);
    if (!badge) {
      throw new NotFoundError("Badge not found");
    }

    // Check if badge is already assigned to user
    const existingUserBadge = await UserBadge.findOne({
      where: { userId, badgeId },
    });

    if (existingUserBadge) {
      throw new ValidationError("Badge is already assigned to this user");
    }

    const userBadge = await UserBadge.create({
      userId,
      badgeId,
      progress,
      maxProgress,
      isEarned,
      earnedAt: isEarned ? new Date() : null,
    });

    logger.info("Badge assigned to user", {
      userId,
      badgeId,
      badgeName: badge.name,
      assignedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: "Badge assigned successfully",
      data: { userBadge },
    });
  })
);

/**
 * @swagger
 * /admin/badges/unassign/{userBadgeId}:
 *   delete:
 *     summary: Remove badge assignment from user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userBadgeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Badge assignment removed successfully
 *       404:
 *         description: Badge assignment not found
 */
router.delete(
  "/badges/unassign/:userBadgeId",
  requireSuperAdmin,
  catchAsync(async (req, res) => {
    const userBadge = await UserBadge.findByPk(req.params.userBadgeId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Badge,
          as: "badge",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!userBadge) {
      throw new NotFoundError("Badge assignment not found");
    }

    await userBadge.destroy();

    logger.info("Badge assignment removed", {
      userId: userBadge.userId,
      badgeId: userBadge.badgeId,
      badgeName: userBadge.badge.name,
      removedBy: req.user.id,
    });

    res.json({
      success: true,
      message: "Badge assignment removed successfully",
    });
  })
);

/**
 * @swagger
 * /admin/badges/stats:
 *   get:
 *     summary: Get badge statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Badge statistics retrieved successfully
 */
router.get(
  "/badges/stats",
  requireSuperAdmin,
  catchAsync(async (req, res) => {
    const totalBadges = await Badge.count();
    const activeBadges = await Badge.count({ where: { isActive: true } });
    const totalAssignments = await UserBadge.count();
    const earnedBadges = await UserBadge.count({ where: { isEarned: true } });

    const badgesByCategory = await Badge.findAll({
      attributes: [
        "category",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["category"],
      raw: true,
    });

    const badgesByRarity = await Badge.findAll({
      attributes: [
        "rarity",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["rarity"],
      raw: true,
    });

    const topEarnedBadges = await UserBadge.findAll({
      attributes: [
        "badgeId",
        [sequelize.fn("COUNT", sequelize.col("UserBadge.id")), "earnedCount"],
      ],
      where: { isEarned: true },
      group: ["badgeId"],
      order: [[sequelize.fn("COUNT", sequelize.col("UserBadge.id")), "DESC"]],
      limit: 10,
      include: [
        {
          model: Badge,
          as: "badge",
          attributes: ["id", "name", "category", "rarity"],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        totalBadges,
        activeBadges,
        totalAssignments,
        earnedBadges,
        badgesByCategory,
        badgesByRarity,
        topEarnedBadges,
      },
    });
  })
);

// ==================== AGENDA MANAGEMENT ROUTES ====================

// Get all agenda items organized by day with check-in counts
router.get(
  "/agenda",
  authenticate,
  requireAdmin,
  catchAsync(async (req, res) => {
    const agendaItems = await Agenda.findAll({
      where: { isActive: true },
      order: [
        ["day", "ASC"],
        ["itemIndex", "ASC"],
        ["isParallel", "ASC"],
      ],
    });

    // Get check-in counts for all agenda items
    const checkInCounts = await AgendaCheckIn.findAll({
      attributes: [
        "agendaId",
        [
          AgendaCheckIn.sequelize.fn(
            "COUNT",
            AgendaCheckIn.sequelize.col("id")
          ),
          "count",
        ],
      ],
      group: ["agendaId"],
      raw: true,
    });

    // Create a map of agendaId to check-in count
    const checkInCountMap = {};
    checkInCounts.forEach((item) => {
      checkInCountMap[item.agendaId] = parseInt(item.count);
    });

    // Organize by day and add check-in counts
    const agendaByDay = {};
    agendaItems.forEach((item) => {
      if (!agendaByDay[item.day]) {
        agendaByDay[item.day] = {
          day: item.day,
          items: [],
          parallel: [],
        };
      }

      // Add check-in count to the item
      const itemWithCount = {
        ...item.toJSON(),
        checkInCount: checkInCountMap[item.id] || 0,
      };

      if (item.isParallel) {
        agendaByDay[item.day].parallel.push(itemWithCount);
      } else {
        agendaByDay[item.day].items.push(itemWithCount);
      }
    });

    // Convert to array
    const agenda = Object.values(agendaByDay);

    res.json({
      success: true,
      data: agenda,
    });
  })
);

// Create new agenda item
router.post(
  "/agenda",
  authenticate,
  requireAdmin,
  catchAsync(async (req, res) => {
    const { day, itemIndex, isParallel, time, title, requiresCheckIn } =
      req.body;

    const agendaItem = await Agenda.create({
      day,
      itemIndex,
      isParallel: isParallel || false,
      time,
      title,
      requiresCheckIn: requiresCheckIn || false,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: agendaItem,
    });
  })
);

// Update agenda item
router.put(
  "/agenda/:id",
  authenticate,
  requireAdmin,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const agendaItem = await Agenda.findByPk(id);
    if (!agendaItem) {
      throw new NotFoundError("Agenda item not found");
    }

    await agendaItem.update(updateData);

    res.json({
      success: true,
      data: agendaItem,
    });
  })
);

// Delete agenda item
router.delete(
  "/agenda/:id",
  authenticate,
  requireAdmin,
  catchAsync(async (req, res) => {
    const { id } = req.params;

    const agendaItem = await Agenda.findByPk(id);
    if (!agendaItem) {
      throw new NotFoundError("Agenda item not found");
    }

    await agendaItem.update({ isActive: false });

    res.json({
      success: true,
      message: "Agenda item deleted successfully",
    });
  })
);

export default router;
