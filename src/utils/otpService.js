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
  logger.info("SendGrid API key configured successfully");
} else {
  logger.warn("SendGrid API key not configured or invalid format");
  logger.warn(
    "Current API key:",
    process.env.SENDGRID_API_KEY
      ? process.env.SENDGRID_API_KEY.substring(0, 10) + "..."
      : "Missing"
  );
  logger.warn(
    "API key starts with SG.:",
    process.env.SENDGRID_API_KEY
      ? process.env.SENDGRID_API_KEY.startsWith("SG.")
      : false
  );
  logger.warn("Full API key check:", {
    hasKey: !!process.env.SENDGRID_API_KEY,
    keyLength: process.env.SENDGRID_API_KEY
      ? process.env.SENDGRID_API_KEY.length
      : 0,
    startsWithSG: process.env.SENDGRID_API_KEY
      ? process.env.SENDGRID_API_KEY.startsWith("SG.")
      : false,
  });
}

class OTPService {
  /**
   * Generate OTP code
   */
  static generateOTP(length = 4) {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  /**
   * Generate OTP for development/staging (randomized OTP)
   */
  static generateFixedOTP() {
    // Generate random OTP for testing (4 digits)
    return this.generateOTP(4);
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

      // Testing real email sending with current SendGrid API key
      // Set to false to disable real email sending
      const shouldSendRealEmails = false; // Set to true to enable real email sending

      if (
        !shouldSendRealEmails &&
        (environment === "development" || environment === "staging")
      ) {
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
          email:
            process.env.SENDGRID_FROM_EMAIL ||
            "achi.koroghlishvili@bene-exclusive.com",
          name: "Networking Georgia",
        },
        // replyTo: {
        //   email: "noreply@networkinggeorgia.com",
        //   name: "Networking Georgia Support",
        // },
        subject: this.getEmailSubject(purpose),
        text: this.getEmailText(otp, purpose),
        // html: `<h1>Your OTP Code: ${otp}</h1><p>This code will expire in 10 minutes.</p>`,
        // Simplified configuration to match working direct test
      };

      // Debug: Log the message being sent
      logger.info("Sending email with SendGrid:", {
        to: msg.to,
        from: msg.from,
        subject: msg.subject,
        hasApiKey: !!process.env.SENDGRID_API_KEY,
        apiKeyPrefix: process.env.SENDGRID_API_KEY
          ? process.env.SENDGRID_API_KEY.substring(0, 10) + "..."
          : "none",
      });

      // Reinitialize SendGrid client to ensure fresh instance
      const sgMailFresh = await import("@sendgrid/mail");
      sgMailFresh.default.setApiKey(process.env.SENDGRID_API_KEY);

      await sgMailFresh.default.send(msg);

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
      verification: "Verify Your Email - Networking Georgia",
      login: "Your Login Code - Networking Georgia",
      password_reset: "Password Reset Code - Networking Georgia",
      phone_verification: "Phone Verification Code - Networking Georgia",
      two_factor: "Two-Factor Authentication Code - Networking Georgia",
    };

    return subjects[purpose] || "Your Verification Code - Networking Georgia";
  }

  /**
   * Get email text content
   */
  static getEmailText(otp, purpose) {
    const baseText = `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.\n\nBest regards,\nNetworking Georgia Team`;

    const purposeTexts = {
      verification: `Welcome to Networking Georgia!\n\nPlease use the following code to verify your email address:\n\n${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account, please ignore this email.`,
      login: `Someone requested a login code for your Networking Georgia account.\n\nYour login code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf this wasn't you, please secure your account immediately.`,
      password_reset: `You requested to reset your password for Networking Georgia.\n\nYour reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
    };

    return purposeTexts[purpose] || baseText;
  }

  /**
   * Get email HTML content
   */
  static getEmailHTML(otp, purpose) {
    const baseHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>Your Verification Code - Networking Georgia</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            color: #333333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 0; 
            background-color: #f8f9fa;
          }
          .container { 
            background-color: #ffffff; 
            margin: 20px auto; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header { 
            background-color: #1e40af; 
            color: #ffffff; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
            font-weight: 600; 
          }
          .header p { 
            margin: 8px 0 0 0; 
            font-size: 14px; 
            opacity: 0.9; 
          }
          .content { 
            padding: 30px 20px; 
          }
          .content h2 { 
            margin: 0 0 20px 0; 
            font-size: 20px; 
            color: #1f2937; 
          }
          .content p { 
            margin: 0 0 20px 0; 
            font-size: 16px; 
            color: #4b5563; 
          }
          .otp-container { 
            text-align: center; 
            margin: 30px 0; 
          }
          .otp-code { 
            display: inline-block; 
            background-color: #1e40af; 
            color: #ffffff; 
            font-size: 28px; 
            font-weight: 700; 
            padding: 20px 30px; 
            border-radius: 8px; 
            letter-spacing: 3px; 
            font-family: 'Courier New', monospace;
            margin: 10px 0;
          }
          .expiry-notice { 
            background-color: #fef3c7; 
            border: 1px solid #f59e0b; 
            padding: 15px; 
            border-radius: 6px; 
            margin: 20px 0; 
            font-size: 14px; 
            color: #92400e; 
          }
          .security-notice { 
            background-color: #f3f4f6; 
            border-left: 4px solid #6b7280; 
            padding: 15px; 
            margin: 20px 0; 
            font-size: 14px; 
            color: #374151; 
          }
          .footer { 
            background-color: #f9fafb; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px; 
            color: #6b7280; 
            border-top: 1px solid #e5e7eb; 
          }
          .footer p { 
            margin: 5px 0; 
          }
          @media only screen and (max-width: 600px) {
            .container { margin: 10px; }
            .header, .content { padding: 20px 15px; }
            .otp-code { font-size: 24px; padding: 15px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Networking Georgia</h1>
            <p>Professional Networking Platform</p>
          </div>
          <div class="content">
            <h2>Your Verification Code</h2>
            <p>Please use the following verification code to complete your request:</p>
            <div class="otp-container">
              <div class="otp-code">${otp}</div>
            </div>
            <div class="expiry-notice">
              <strong>⏰ Expires in 10 minutes</strong><br>
              This code will automatically expire for security reasons.
            </div>
            <div class="security-notice">
              <strong>🔒 Security Notice:</strong><br>
              • Never share this code with anyone<br>
              • Networking Georgia will never ask for your verification code via phone or email<br>
              • If you didn't request this code, please ignore this email
            </div>
            <p>If you have any questions or concerns, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 Networking Georgia. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>If you need assistance, please contact us at support@networkinggeorgia.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const purposeHTMLs = {
      verification: baseHTML
        .replace("Your Verification Code", "Welcome to Networking Georgia!")
        .replace(
          "Please use the following verification code to complete your request:",
          "Please use the following verification code to verify your email address:"
        ),
      login: baseHTML
        .replace("Your Verification Code", "Login Verification")
        .replace(
          "Please use the following verification code to complete your request:",
          "Use this verification code to securely log into your account:"
        ),
      password_reset: baseHTML
        .replace("Your Verification Code", "Password Reset")
        .replace(
          "Please use the following verification code to complete your request:",
          "Use this verification code to reset your password:"
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
