import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Op } from "sequelize";
import { User } from "../models/User.js";
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
} from "../middleware/auth.js";
import {
  validate,
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  sendPasswordResetOTPSchema,
  resetPasswordWithOTPSchema,
  sendEmailVerificationOTPSchema,
} from "../middleware/validation.js";
import {
  catchAsync,
  AppError,
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";
import { sendEmail } from "../utils/email.js";
import OTPService from "../utils/otpService.js";

const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: password123
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               phoneNumber:
 *                 type: string
 *                 example: +1234567890
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                   example: User registered successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Register - Only collect minimal data, don't create user yet
router.post(
  "/register",
  validate(registerSchema),
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    // Store registration data temporarily (in production, you might want to use Redis)
    // For now, we'll just send OTP and store data in the OTP record
    try {
      const result = await OTPService.sendRegistrationOTP(email, {
        email: email.toLowerCase(),
        password,
      });

      logger.info("Registration OTP sent", {
        email: email.toLowerCase(),
      });

      res.status(201).json({
        success: true,
        message:
          "Registration initiated. Please verify your email with the OTP sent.",
        data: {
          email: email.toLowerCase(),
          otpRecordId: result.otpRecordId,
        },
      });
    } catch (error) {
      logger.error("Failed to send registration OTP", {
        email: email.toLowerCase(),
        error: error.message,
      });

      throw new Error("Failed to send verification code. Please try again.");
    }
  })
);

// Login
router.post(
  "/login",
  validate(loginSchema),
  catchAsync(async (req, res) => {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.password) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid email or password");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError("Account is deactivated");
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new AuthenticationError(
        "Please verify your email before logging in"
      );
    }

    // Send OTP for verification instead of returning tokens immediately
    try {
      const result = await OTPService.sendEmailVerificationOTP(email);

      logger.info("OTP sent for login verification", {
        userId: user.id,
        email: user.email,
      });

      res.json({
        success: true,
        message: "Please verify your email with the OTP sent",
        data: {
          email: user.email,
          otpRecordId: result.otpRecordId,
        },
      });
    } catch (error) {
      logger.error("Failed to send OTP for login", {
        userId: user.id,
        email: user.email,
        error: error.message,
      });

      throw new AuthenticationError(
        "Failed to send verification code. Please try again."
      );
    }
  })
);

// Verify email
router.post(
  "/verify-email",
  catchAsync(async (req, res) => {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError("Verification token is required");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      throw new ValidationError("Invalid or expired verification token");
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    logger.info("Email verified successfully", {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  })
);

// Resend verification email
router.post(
  "/resend-verification",
  catchAsync(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError("Email is required");
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new ValidationError("User not found");
    }

    if (user.isEmailVerified) {
      throw new ValidationError("Email is already verified");
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    // Send verification email
    try {
      await sendEmail({
        email: user.email,
        subject: "Verify your Georgia Connects Hub account",
        template: "emailVerification",
        data: {
          name: user.getFullName(),
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`,
        },
      });

      res.json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (emailError) {
      logger.error("Failed to send verification email:", emailError);
      throw new AppError("Failed to send verification email", 500);
    }
  })
);

// Forgot password
router.post(
  "/forgot-password",
  catchAsync(async (req, res) => {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError("Email is required");
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    // Send reset email
    try {
      await sendEmail({
        email: user.email,
        subject: "Reset your Georgia Connects Hub password",
        template: "passwordReset",
        data: {
          name: user.getFullName(),
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        },
      });

      logger.info("Password reset email sent", {
        userId: user.id,
        email: user.email,
      });
    } catch (emailError) {
      logger.error("Failed to send password reset email:", emailError);
      throw new AppError("Failed to send password reset email", 500);
    }

    res.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent",
    });
  })
);

// Reset password
router.post(
  "/reset-password",
  catchAsync(async (req, res) => {
    const { token, password } = req.body;

    if (!token || !password) {
      throw new ValidationError("Reset token and password are required");
    }

    if (password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters long");
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      throw new ValidationError("Invalid or expired reset token");
    }

    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    logger.info("Password reset successfully", {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  })
);

// Refresh token
router.post(
  "/refresh",
  catchAsync(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== "refresh") {
      throw new AuthenticationError("Invalid refresh token");
    }

    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive || user.refreshToken !== refreshToken) {
      throw new AuthenticationError("Invalid refresh token");
    }

    // Generate new tokens
    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  })
);

// Logout
router.post(
  "/logout",
  authenticate,
  catchAsync(async (req, res) => {
    // Clear refresh token
    req.user.refreshToken = null;
    await req.user.save();

    logger.info("User logged out successfully", { userId: req.user.id });

    res.json({
      success: true,
      message: "Logout successful",
    });
  })
);

// Get current user
router.get(
  "/me",
  authenticate,
  catchAsync(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.user.toJSON(),
      },
    });
  })
);

// Change password
router.post(
  "/change-password",
  authenticate,
  catchAsync(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError(
        "Current password and new password are required"
      );
    }

    if (newPassword.length < 6) {
      throw new ValidationError(
        "New password must be at least 6 characters long"
      );
    }

    // Verify current password
    const isCurrentPasswordValid = await req.user.comparePassword(
      currentPassword
    );
    if (!isCurrentPasswordValid) {
      throw new AuthenticationError("Current password is incorrect");
    }

    // Update password
    req.user.password = newPassword;
    await req.user.save();

    logger.info("Password changed successfully", { userId: req.user.id });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  })
);

// Google OAuth (placeholder - would need actual Google OAuth implementation)
router.post(
  "/google",
  catchAsync(async (req, res) => {
    // This would integrate with Google OAuth 2.0
    // For now, return a placeholder response
    throw new AppError("Google OAuth not implemented yet", 501);
  })
);

/**
 * @swagger
 * /auth/send-verification-otp:
 *   post:
 *     summary: Send OTP for email verification
 *     tags: [Authentication]
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
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Send verification OTP
router.post(
  "/send-verification-otp",
  validate(sendEmailVerificationOTPSchema),
  catchAsync(async (req, res) => {
    const { email } = req.body;

    const result = await OTPService.sendEmailVerificationOTP(email);

    res.json({
      success: result.success,
      message: result.message,
      data: {
        otpRecordId: result.otpRecordId,
        // Include OTP in response for development/staging
        ...(result.otp && { otp: result.otp }),
      },
    });
  })
);

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP for email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "4444"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid or expired OTP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Verify OTP
router.post(
  "/verify-otp",
  validate(verifyOTPSchema),
  catchAsync(async (req, res) => {
    const { email, otp } = req.body;

    // First try to verify as registration OTP
    let result = await OTPService.verifyOTPRecord(email, otp, "registration");
    let isRegistration = result.success;

    // If not registration, try verification OTP (for login)
    if (!isRegistration) {
      result = await OTPService.verifyOTPRecord(email, otp, "verification");
    }

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    let user;

    if (isRegistration) {
      // Create new user from registration data (minimal data only)
      const registrationData = result.otpRecord.additionalData;
      user = await User.create({
        email: registrationData.email,
        password: registrationData.password,
        firstName: "", // Will be set during profile completion
        lastName: "", // Will be set during profile completion
        isEmailVerified: true,
        lastLogin: new Date(),
        lastActivityDate: new Date(),
      });

      logger.info("User created and verified through registration", {
        userId: user.id,
        email: user.email,
      });
    } else {
      // Find and update existing user email verification status
      user = await User.findOne({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Update email verification status and last login
      user.isEmailVerified = true;
      user.lastLogin = new Date();
      user.lastActivityDate = new Date();
      await user.save();

      logger.info("User email verified and authenticated successfully", {
        userId: user.id,
        email: user.email,
      });
    }

    // Generate tokens after successful OTP verification
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      success: true,
      message: isRegistration
        ? "Registration completed successfully"
        : "Email verified successfully",
      data: {
        user: user.toJSON(),
        token,
        refreshToken,
        verified: true,
        verifiedAt: new Date(),
        isNewUser: isRegistration,
      },
    });
  })
);

/**
 * @swagger
 * /auth/send-password-reset-otp:
 *   post:
 *     summary: Send OTP for password reset
 *     tags: [Authentication]
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
 *         description: Password reset OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Send password reset OTP
router.post(
  "/send-password-reset-otp",
  validate(sendPasswordResetOTPSchema),
  catchAsync(async (req, res) => {
    const { email } = req.body;

    // Check if user exists
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

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
  })
);

/**
 * @swagger
 * /auth/reset-password-with-otp:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "4444"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Invalid OTP or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Reset password with OTP
router.post(
  "/reset-password-with-otp",
  validate(resetPasswordWithOTPSchema),
  catchAsync(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    // Verify OTP
    const result = await OTPService.verifyOTPRecord(
      email,
      otp,
      "password_reset"
    );

    if (!result.success) {
      throw new ValidationError(result.message);
    }

    // Find user and update password
    const user = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    user.password = newPassword;
    await user.save();

    logger.info("Password reset successfully", {
      userId: user.id,
      email: user.email,
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  })
);

export default router;
