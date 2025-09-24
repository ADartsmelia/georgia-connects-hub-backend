"use strict";

import sgMail from "@sendgrid/mail";
import crypto from "crypto";
import { Op } from "sequelize";
import { logger } from "./logger.js";

// Configure SendGrid (only if API key is valid)
if (
  process.env.SENDGRID_API_KEY &&
  process.env.SENDGRID_API_KEY.startsWith("SG.")
) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

class OTPService {
  /**
   * Generate OTP code
   */
  static generateOTP(length = 6) {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  /**
   * Generate OTP for development/staging (fixed OTP)
   */
  static generateFixedOTP() {
    // Always use fixed OTP for testing
    return "4444"; // Fixed OTP for testing
  }

  /**
   * Hash OTP for secure storage
   */
  static hashOTP(otp) {
    return crypto.createHash("sha256").update(otp).digest("hex");
  }

  /**
   * Verify OTP
   */
  static verifyOTP(providedOTP, hashedOTP) {
    const hashedProvidedOTP = this.hashOTP(providedOTP);
    return hashedProvidedOTP === hashedOTP;
  }

  /**
   * Send OTP via SendGrid email
   */
  static async sendOTPEmail(email, otp, purpose = "verification") {
    try {
      const environment = process.env.NODE_ENV || "development";

      // Don't send actual emails in development/staging with fixed OTP
      if (environment === "development" || environment === "staging") {
        logger.info(`OTP for ${email}: ${otp} (Fixed OTP for ${environment})`);
        return {
          success: true,
          message: `OTP sent to ${email}`,
          otp: otp, // Return OTP for development
        };
      }

      const msg = {
        to: email,
        from: {
          email: process.env.FROM_EMAIL || "noreply@georgia-connects-hub.com",
          name: process.env.FROM_NAME || "Georgia Connects Hub",
        },
        subject: this.getEmailSubject(purpose),
        text: this.getEmailText(otp, purpose),
        html: this.getEmailHTML(otp, purpose),
      };

      await sgMail.send(msg);

      logger.info(`OTP email sent successfully to ${email}`);

      return {
        success: true,
        message: `OTP sent to ${email}`,
      };
    } catch (error) {
      logger.error("Error sending OTP email:", error);

      // If SendGrid fails, log the OTP for manual verification
      logger.error(`OTP for ${email}: ${otp} (Email sending failed)`);

      return {
        success: false,
        message: "Failed to send OTP email",
        error: error.message,
        otp: otp, // Return OTP for manual verification
      };
    }
  }

  /**
   * Send OTP via SMS (placeholder for future implementation)
   */
  static async sendOTPSMS(phoneNumber, otp, purpose = "verification") {
    try {
      // TODO: Implement SMS service integration (Twilio, AWS SNS, etc.)
      logger.info(
        `SMS OTP for ${phoneNumber}: ${otp} (SMS not implemented yet)`
      );

      return {
        success: true,
        message: `OTP sent to ${phoneNumber}`,
        otp: otp, // Return OTP for development
      };
    } catch (error) {
      logger.error("Error sending OTP SMS:", error);
      return {
        success: false,
        message: "Failed to send OTP SMS",
        error: error.message,
      };
    }
  }

  /**
   * Get email subject based on purpose
   */
  static getEmailSubject(purpose) {
    const subjects = {
      verification: "Verify Your Email - Georgia Connects Hub",
      login: "Your Login Code - Georgia Connects Hub",
      password_reset: "Password Reset Code - Georgia Connects Hub",
      phone_verification: "Phone Verification Code - Georgia Connects Hub",
      two_factor: "Two-Factor Authentication Code - Georgia Connects Hub",
    };

    return subjects[purpose] || "Your Verification Code - Georgia Connects Hub";
  }

  /**
   * Get email text content
   */
  static getEmailText(otp, purpose) {
    const baseText = `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nGeorgia Connects Hub Team`;

    const purposeTexts = {
      verification: `Welcome to Georgia Connects Hub!\n\nPlease use the following code to verify your email address:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account, please ignore this email.`,
      login: `Someone requested a login code for your Georgia Connects Hub account.\n\nYour login code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf this wasn't you, please secure your account immediately.`,
      password_reset: `You requested to reset your password for Georgia Connects Hub.\n\nYour reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
    };

    return purposeTexts[purpose] || baseText;
  }

  /**
   * Get email HTML content
   */
  static getEmailHTML(otp, purpose) {
    const baseHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verification Code</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-code { background: #667eea; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Georgia Connects Hub</h1>
          <p>Professional Networking Platform</p>
        </div>
        <div class="content">
          <h2>Your Verification Code</h2>
          <p>Please use the following code to complete your request:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in <strong>10 minutes</strong>.</p>
          <div class="warning">
            <strong>Security Notice:</strong> Never share this code with anyone. Georgia Connects Hub will never ask for your verification code via phone or email.
          </div>
          <p>If you didn't request this code, please ignore this email and consider securing your account.</p>
        </div>
        <div class="footer">
          <p>© 2024 Georgia Connects Hub. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </body>
      </html>
    `;

    const purposeHTMLs = {
      verification: baseHTML
        .replace("Your Verification Code", "Welcome to Georgia Connects Hub!")
        .replace(
          "Please use the following code to complete your request:",
          "Please use the following code to verify your email address:"
        ),
      login: baseHTML
        .replace("Your Verification Code", "Login Verification")
        .replace(
          "Please use the following code to complete your request:",
          "Use this code to securely log into your account:"
        ),
      password_reset: baseHTML
        .replace("Your Verification Code", "Password Reset")
        .replace(
          "Please use the following code to complete your request:",
          "Use this code to reset your password:"
        ),
    };

    return purposeHTMLs[purpose] || baseHTML;
  }

  /**
   * Create OTP record in database
   */
  static async createOTPRecord(
    userId,
    email,
    phoneNumber,
    purpose = "verification",
    additionalData = null
  ) {
    try {
      const { OTP } = await import("../models/OTP.js");

      const otp = this.generateFixedOTP();
      const hashedOTP = this.hashOTP(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const otpRecord = await OTP.create({
        userId,
        email,
        phoneNumber,
        otp: hashedOTP,
        purpose,
        expiresAt,
        isUsed: false,
        additionalData,
      });

      return {
        otpRecord,
        otp, // Return plain OTP for sending
      };
    } catch (error) {
      logger.error("Error creating OTP record:", error);
      throw error;
    }
  }

  /**
   * Verify OTP from database
   */
  static async verifyOTPRecord(email, otp, purpose = "verification") {
    try {
      const { OTP } = await import("../models/OTP.js");

      const otpRecord = await OTP.findOne({
        where: {
          email,
          purpose,
          isUsed: false,
          expiresAt: {
            [Op.gt]: new Date(),
          },
        },
        order: [["createdAt", "DESC"]],
      });

      if (!otpRecord) {
        return {
          success: false,
          message: "Invalid or expired OTP",
        };
      }

      const isValid = this.verifyOTP(otp, otpRecord.otp);

      if (!isValid) {
        return {
          success: false,
          message: "Invalid OTP",
        };
      }

      // Mark OTP as used
      await otpRecord.update({ isUsed: true });

      return {
        success: true,
        message: "OTP verified successfully",
        otpRecord,
      };
    } catch (error) {
      logger.error("Error verifying OTP record:", error);
      throw error;
    }
  }

  /**
   * Clean up expired OTPs
   */
  static async cleanupExpiredOTPs() {
    try {
      const { OTP } = await import("../models/OTP.js");

      const result = await OTP.destroy({
        where: {
          expiresAt: {
            [Op.lt]: new Date(),
          },
        },
      });

      logger.info(`Cleaned up ${result} expired OTPs`);
      return result;
    } catch (error) {
      logger.error("Error cleaning up expired OTPs:", error);
      throw error;
    }
  }

  /**
   * Send OTP for email verification
   */
  static async sendEmailVerificationOTP(email, userId = null) {
    try {
      const { otpRecord, otp } = await this.createOTPRecord(
        userId,
        email,
        null,
        "verification"
      );

      const result = await this.sendOTPEmail(email, otp, "verification");

      return {
        ...result,
        otpRecordId: otpRecord.id,
      };
    } catch (error) {
      logger.error("Error sending email verification OTP:", error);
      throw error;
    }
  }

  /**
   * Send OTP for phone verification
   */
  static async sendPhoneVerificationOTP(phoneNumber, userId) {
    try {
      const { otpRecord, otp } = await this.createOTPRecord(
        userId,
        null,
        phoneNumber,
        "phone_verification"
      );

      const result = await this.sendOTPSMS(
        phoneNumber,
        otp,
        "phone_verification"
      );

      return {
        ...result,
        otpRecordId: otpRecord.id,
      };
    } catch (error) {
      logger.error("Error sending phone verification OTP:", error);
      throw error;
    }
  }

  /**
   * Send OTP for two-factor authentication
   */
  static async send2FAOTP(email, userId) {
    try {
      const { otpRecord, otp } = await this.createOTPRecord(
        userId,
        email,
        null,
        "two_factor"
      );

      const result = await this.sendOTPEmail(email, otp, "two_factor");

      return {
        ...result,
        otpRecordId: otpRecord.id,
      };
    } catch (error) {
      logger.error("Error sending 2FA OTP:", error);
      throw error;
    }
  }

  /**
   * Send OTP for password reset
   */
  static async sendPasswordResetOTP(email) {
    try {
      const { otpRecord, otp } = await this.createOTPRecord(
        null,
        email,
        null,
        "password_reset"
      );

      const result = await this.sendOTPEmail(email, otp, "password_reset");

      return {
        ...result,
        otpRecordId: otpRecord.id,
      };
    } catch (error) {
      logger.error("Error sending password reset OTP:", error);
      throw error;
    }
  }

  /**
   * Send OTP for registration with temporary data storage
   */
  static async sendRegistrationOTP(email, registrationData) {
    try {
      const { otpRecord, otp } = await this.createOTPRecord(
        null,
        email,
        null,
        "registration",
        registrationData // Store registration data in the OTP record
      );

      const result = await this.sendOTPEmail(email, otp, "registration");

      return {
        ...result,
        otpRecordId: otpRecord.id,
      };
    } catch (error) {
      logger.error("Error sending registration OTP:", error);
      throw error;
    }
  }
}

export default OTPService;
