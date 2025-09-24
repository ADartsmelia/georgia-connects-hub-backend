"use strict";

const express = require("express");
const router = express.Router();
const { authenticate, optionalAuth } = require("../middleware/auth");
const { validateRequest } = require("../middleware/validation");
const {
  AppError,
  NotFoundError,
  ValidationError,
} = require("../middleware/errorHandler");
const { logger } = require("../utils/logger");
const OTPService = require("../utils/otpService").default;

/**
 * @swagger
 * /otp/send-email-verification:
 *   post:
 *     summary: Send OTP for email verification
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID (optional)
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP sent to user@example.com
 *                 otpRecordId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Send email verification OTP
router.post(
  "/send-email-verification",
  validateRequest({
    body: {
      email: "string",
      userId: "string",
    },
  }),
  async (req, res, next) => {
    try {
      const { email, userId } = req.body;

      const result = await OTPService.sendEmailVerificationOTP(email, userId);

      res.json({
        success: result.success,
        message: result.message,
        data: {
          otpRecordId: result.otpRecordId,
          // Include OTP in response for development/staging
          ...(result.otp && { otp: result.otp }),
        },
      });
    } catch (error) {
      logger.error("Error sending email verification OTP:", error);
      next(error);
    }
  }
);

/**
 * @swagger
 * /otp/send-phone-verification:
 *   post:
 *     summary: Send OTP for phone verification
 *     tags: [OTP]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: +1234567890
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP sent to +1234567890
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Send phone verification OTP
router.post(
  "/send-phone-verification",
  authenticate,
  validateRequest({
    body: {
      phoneNumber: "string",
    },
  }),
  async (req, res, next) => {
    try {
      const { phoneNumber } = req.body;

      const result = await OTPService.sendPhoneVerificationOTP(
        phoneNumber,
        req.user.id
      );

      res.json({
        success: result.success,
        message: result.message,
        data: {
          otpRecordId: result.otpRecordId,
          // Include OTP in response for development/staging
          ...(result.otp && { otp: result.otp }),
        },
      });
    } catch (error) {
      logger.error("Error sending phone verification OTP:", error);
      next(error);
    }
  }
);

/**
 * @swagger
 * /otp/send-password-reset:
 *   post:
 *     summary: Send OTP for password reset
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password reset OTP sent to user@example.com
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Send password reset OTP
router.post(
  "/send-password-reset",
  validateRequest({
    body: {
      email: "string",
    },
  }),
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const result = await OTPService.sendPasswordResetOTP(email);

      res.json({
        success: result.success,
        message: result.message,
        data: {
          otpRecordId: result.otpRecordId,
          // Include OTP in response for development/staging
          ...(result.otp && { otp: result.otp }),
        },
      });
    } catch (error) {
      logger.error("Error sending password reset OTP:", error);
      next(error);
    }
  }
);

/**
 * @swagger
 * /otp/send-2fa:
 *   post:
 *     summary: Send OTP for two-factor authentication
 *     tags: [OTP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 2FA OTP sent to user@example.com
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Send 2FA OTP
router.post("/send-2fa", authenticate, async (req, res, next) => {
  try {
    const result = await OTPService.send2FAOTP(req.user.email, req.user.id);

    res.json({
      success: result.success,
      message: result.message,
      data: {
        otpRecordId: result.otpRecordId,
        // Include OTP in response for development/staging
        ...(result.otp && { otp: result.otp }),
      },
    });
  } catch (error) {
    logger.error("Error sending 2FA OTP:", error);
    next(error);
  }
});

/**
 * @swagger
 * /otp/verify:
 *   post:
 *     summary: Verify OTP
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - purpose
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "4444"
 *               purpose:
 *                 type: string
 *                 enum: [verification, login, password_reset, phone_verification, two_factor, account_recovery]
 *                 example: verification
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Verify OTP
router.post(
  "/verify",
  validateRequest({
    body: {
      email: "string",
      otp: "string",
      purpose: "string",
    },
  }),
  async (req, res, next) => {
    try {
      const { email, otp, purpose } = req.body;

      const result = await OTPService.verifyOTPRecord(email, otp, purpose);

      if (!result.success) {
        throw new ValidationError(result.message);
      }

      res.json({
        success: true,
        message: "OTP verified successfully",
        data: {
          verified: true,
          purpose,
          verifiedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Error verifying OTP:", error);
      next(error);
    }
  }
);

/**
 * @swagger
 * /otp/resend:
 *   post:
 *     summary: Resend OTP
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - purpose
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               purpose:
 *                 type: string
 *                 enum: [verification, login, password_reset, phone_verification, two_factor, account_recovery]
 *                 example: verification
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: User ID (optional)
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP resent to user@example.com
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Resend OTP
router.post(
  "/resend",
  validateRequest({
    body: {
      email: "string",
      purpose: "string",
      userId: "string",
    },
  }),
  async (req, res, next) => {
    try {
      const { email, purpose, userId } = req.body;

      let result;
      switch (purpose) {
        case "verification":
          result = await OTPService.sendEmailVerificationOTP(email, userId);
          break;
        case "password_reset":
          result = await OTPService.sendPasswordResetOTP(email);
          break;
        case "two_factor":
          if (!userId) {
            throw new ValidationError("User ID is required for 2FA");
          }
          result = await OTPService.send2FAOTP(email, userId);
          break;
        default:
          throw new ValidationError("Invalid purpose for resending OTP");
      }

      res.json({
        success: result.success,
        message: result.message,
        data: {
          otpRecordId: result.otpRecordId,
          // Include OTP in response for development/staging
          ...(result.otp && { otp: result.otp }),
        },
      });
    } catch (error) {
      logger.error("Error resending OTP:", error);
      next(error);
    }
  }
);

/**
 * @swagger
 * /otp/cleanup:
 *   post:
 *     summary: Clean up expired OTPs (Admin only)
 *     tags: [OTP]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired OTPs cleaned up successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Cleaned up 15 expired OTPs
 *                 data:
 *                   type: object
 *                   properties:
 *                     cleanedCount:
 *                       type: integer
 *                       example: 15
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (Admin access required)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Clean up expired OTPs (Admin only)
router.post("/cleanup", authenticate, async (req, res, next) => {
  try {
    // Check if user is admin
    if (!req.user.isAdmin) {
      throw new AppError("Admin access required", 403);
    }

    const cleanedCount = await OTPService.cleanupExpiredOTPs();

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired OTPs`,
      data: {
        cleanedCount,
      },
    });
  } catch (error) {
    logger.error("Error cleaning up expired OTPs:", error);
    next(error);
  }
});

module.exports = router;
