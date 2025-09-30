import express from "express";
import crypto from "crypto";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import QRCodeModel from "../models/QRCode.js";
import { User } from "../models/index.js";
import { authenticate, isAdmin } from "../middleware/auth.js";
import {
  validate,
  generateAndEmailQRSchema,
} from "../middleware/validation.js";
import { sendEmail } from "../utils/email.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * Generate a unique QR code
 * POST /api/v1/qr/generate
 * Body: { userEmail?: string, passType?: 'day_pass' | 'full_pass' }
 */
router.post("/generate", async (req, res) => {
  try {
    const { userEmail, passType = "day_pass" } = req.body;

    // Validate passType
    if (passType && !["day_pass", "full_pass"].includes(passType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pass type. Must be 'day_pass' or 'full_pass'",
      });
    }

    // Generate unique code
    const code = crypto.randomBytes(16).toString("hex");

    // Find user if email provided
    let userId = null;
    if (userEmail) {
      const user = await User.findOne({ where: { email: userEmail } });
      if (user) {
        userId = user.id;
      }
    }

    // Create QR code record
    const qrCode = await QRCodeModel.create({
      code,
      passType,
      userId,
      status: "active",
    });

    return res.status(201).json({
      success: true,
      message: "QR code generated successfully",
      data: {
        id: qrCode.id,
        code: qrCode.code,
        passType: qrCode.passType,
        userId: qrCode.userId,
        status: qrCode.status,
        createdAt: qrCode.createdAt,
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate QR code",
      error: error.message,
    });
  }
});

/**
 * Validate and scan QR code (Admin only)
 * POST /api/v1/qr/scan
 * Body: { code: string }
 */
router.post("/scan", authenticate, isAdmin, async (req, res) => {
  try {
    const { code } = req.body;
    const adminId = req.user.id;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "QR code is required",
      });
    }

    // Find QR code
    const qrCode = await QRCodeModel.findOne({
      where: { code },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName", "phoneNumber"],
        },
        {
          model: User,
          as: "scanner",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message:
          "❌ QR Code Not Found - This code is not registered in the system",
        details:
          "Please check the QR code and try again, or contact support if this error persists.",
      });
    }

    // Check if already used
    if (qrCode.status === "used") {
      const scannedDate = new Date(qrCode.scannedAt).toLocaleString();
      const scannerName = qrCode.scanner
        ? `${qrCode.scanner.firstName} ${qrCode.scanner.lastName}`
        : "Unknown";

      return res.status(400).json({
        success: false,
        message: "⚠️ Already Used - This QR code has already been scanned",
        details: `Scanned on ${scannedDate} by ${scannerName}`,
        data: {
          scannedAt: qrCode.scannedAt,
          scannedBy: qrCode.scannedBy,
          scanner: qrCode.scanner,
        },
      });
    }

    // Check if expired
    if (qrCode.status === "expired") {
      return res.status(400).json({
        success: false,
        message: "⏰ Expired - This QR code has expired and cannot be used",
        details: "Please request a new QR code.",
      });
    }

    // Mark as used
    qrCode.status = "used";
    qrCode.scannedAt = new Date();
    qrCode.scannedBy = adminId;
    qrCode.metadata = {
      ...qrCode.metadata,
      scanIp: req.ip,
      scanUserAgent: req.get("user-agent"),
    };
    await qrCode.save();

    return res.status(200).json({
      success: true,
      message: "QR code scanned successfully",
      data: {
        id: qrCode.id,
        code: qrCode.code,
        userId: qrCode.userId,
        user: qrCode.user,
        status: qrCode.status,
        scannedAt: qrCode.scannedAt,
        createdAt: qrCode.createdAt,
      },
    });
  } catch (error) {
    console.error("Error scanning QR code:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to scan QR code",
      error: error.message,
    });
  }
});

/**
 * Get all QR codes (Admin only)
 * GET /api/v1/qr/all
 */
router.get("/all", authenticate, isAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const offset = (page - 1) * limit;

    const { count, rows: qrCodes } = await QRCodeModel.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName"],
        },
        {
          model: User,
          as: "scanner",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.status(200).json({
      success: true,
      message: "QR codes retrieved successfully",
      data: {
        qrCodes,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching QR codes:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch QR codes",
      error: error.message,
    });
  }
});

/**
 * Get QR code by ID (Admin only)
 * GET /api/v1/qr/:id
 */
router.get("/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const qrCode = await QRCodeModel.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "email", "firstName", "lastName", "phoneNumber"],
        },
        {
          model: User,
          as: "scanner",
          attributes: ["id", "email", "firstName", "lastName"],
        },
      ],
    });

    if (!qrCode) {
      return res.status(404).json({
        success: false,
        message: "QR code not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "QR code retrieved successfully",
      data: qrCode,
    });
  } catch (error) {
    console.error("Error fetching QR code:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch QR code",
      error: error.message,
    });
  }
});

/**
 * Get QR code statistics (Admin only)
 * GET /api/v1/qr/stats
 */
router.get("/stats/overview", authenticate, isAdmin, async (req, res) => {
  try {
    const [total, active, used, expired] = await Promise.all([
      QRCodeModel.count(),
      QRCodeModel.count({ where: { status: "active" } }),
      QRCodeModel.count({ where: { status: "used" } }),
      QRCodeModel.count({ where: { status: "expired" } }),
    ]);

    return res.status(200).json({
      success: true,
      message: "QR code statistics retrieved successfully",
      data: {
        total,
        active,
        used,
        expired,
      },
    });
  } catch (error) {
    console.error("Error fetching QR code statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch QR code statistics",
      error: error.message,
    });
  }
});

/**
 * Generate QR code and send via email (Admin only)
 * POST /api/v1/qr/generate-and-email
 * Body: { email: string, passType?: 'day_pass' | 'full_pass', userEmail?: string, recipientName?: string }
 */
router.post(
  "/generate-and-email",
  authenticate,
  isAdmin,
  validate(generateAndEmailQRSchema),
  async (req, res) => {
    try {
      const {
        email,
        passType = "day_pass",
        userEmail,
        recipientName,
      } = req.body;

      // Generate unique code
      const code = crypto.randomBytes(16).toString("hex");

      // Find user if email provided
      let userId = null;
      let user = null;
      if (userEmail) {
        user = await User.findOne({ where: { email: userEmail } });
        if (user) {
          userId = user.id;
        }
      }

      // Create QR code record
      const qrCodeRecord = await QRCodeModel.create({
        code,
        passType,
        userId,
        status: "active",
      });

      // Generate QR code as image buffer (smaller size for email embedding)
      const qrCodeBuffer = await QRCode.toBuffer(code, {
        type: "png",
        width: 200, // Reduced from 400 to 200
        margin: 1,  // Reduced margin
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Prepare email data
      const emailData = {
        recipientName:
          recipientName ||
          (user ? `${user.firstName} ${user.lastName}` : "Guest"),
        qrCode: code,
        passType: passType,
        passTypeClass: passType === "day_pass" ? "day-pass" : "full-pass",
        isDayPass: passType === "day_pass",
      };

      // Prepare QR code attachment only
      const attachments = [
        {
          filename: `networking-georgia-qr-${code}.png`,
          content: qrCodeBuffer,
          contentType: "image/png",
          cid: "qr-code-image",
        },
      ];

      // Send email with QR code attachment
      await sendEmail({
        email,
        template: "qrCodePass",
        data: emailData,
        attachments,
      });

      return res.status(201).json({
        success: true,
        message: "QR code generated and sent via email successfully",
        data: {
          id: qrCodeRecord.id,
          code: qrCodeRecord.code,
          passType: qrCodeRecord.passType,
          userId: qrCodeRecord.userId,
          status: qrCodeRecord.status,
          createdAt: qrCodeRecord.createdAt,
          emailSent: true,
          recipientEmail: email,
          recipientName: emailData.recipientName,
        },
      });
    } catch (error) {
      console.error("Error generating and emailing QR code:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to generate and email QR code",
        error: error.message,
      });
    }
  }
);

export default router;
