import nodemailer from "nodemailer";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Email templates
const templates = {
  emailVerification: {
    subject: "Verify Your Georgia Connects Hub Account",
    template: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Georgia Connects Hub</h1>
          </div>
          <div class="content">
            <h2>Welcome, {{name}}!</h2>
            <p>Thank you for joining Georgia Connects Hub. To complete your registration and start connecting with professionals across Georgia, please verify your email address.</p>
            <p>Click the button below to verify your account:</p>
            <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>{{verificationUrl}}</p>
            <p>This verification link will expire in 24 hours.</p>
          </div>
          <div class="footer">
            <p>If you didn't create an account with Georgia Connects Hub, you can safely ignore this email.</p>
            <p>&copy; 2024 Georgia Connects Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  passwordReset: {
    subject: "Reset Your Georgia Connects Hub Password",
    template: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Georgia Connects Hub</h1>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello {{name}},</p>
            <p>We received a request to reset your password for your Georgia Connects Hub account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="{{resetUrl}}" class="button">Reset Password</a>
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p>{{resetUrl}}</p>
            <div class="warning">
              <p><strong>Important:</strong> This password reset link will expire in 10 minutes for security reasons.</p>
              <p>If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2024 Georgia Connects Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  welcome: {
    subject: "Welcome to Georgia Connects Hub!",
    template: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #059669; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .button { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Georgia Connects Hub!</h1>
          </div>
          <div class="content">
            <h2>Hello {{name}}!</h2>
            <p>Welcome to Georgia Connects Hub - your gateway to professional networking in Georgia!</p>
            
            <h3>Here's what you can do:</h3>
            <div class="feature">
              <h4>🔗 Connect with Professionals</h4>
              <p>Build meaningful connections with professionals across Georgia</p>
            </div>
            <div class="feature">
              <h4>💬 MindBoard</h4>
              <p>Share insights, ask questions, and engage with the community</p>
            </div>
            <div class="feature">
              <h4>🎯 Sponsors & Offers</h4>
              <p>Discover exclusive deals from local businesses and services</p>
            </div>
            <div class="feature">
              <h4>📚 Learning Resources</h4>
              <p>Access educational content and participate in quizzes</p>
            </div>
            
            <p>Ready to get started? Complete your profile to unlock all features:</p>
            <a href="{{profileUrl}}" class="button">Complete Profile</a>
          </div>
          <div class="footer">
            <p>Need help? Contact us at support@georgiaconnects.com</p>
            <p>&copy; 2024 Georgia Connects Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
  connectionRequest: {
    subject: "New Connection Request on Georgia Connects Hub",
    template: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Connection Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f8fafc; }
          .button { display: inline-block; padding: 12px 24px; background: #7c3aed; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Georgia Connects Hub</h1>
          </div>
          <div class="content">
            <h2>New Connection Request</h2>
            <p>Hello {{recipientName}},</p>
            <p><strong>{{requesterName}}</strong> wants to connect with you on Georgia Connects Hub.</p>
            {{#if message}}
            <p><em>"{{message}}"</em></p>
            {{/if}}
            <p>Click below to view and respond to this connection request:</p>
            <a href="{{connectionUrl}}" class="button">View Connection Request</a>
          </div>
          <div class="footer">
            <p>&copy; 2024 Georgia Connects Hub. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

// Send email function
export const sendEmail = async ({ email, subject, template, data = {} }) => {
  try {
    const transporter = createTransporter();

    // Get template
    const emailTemplate = templates[template];
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    // Compile template
    const compiledTemplate = handlebars.compile(emailTemplate.template);
    const html = compiledTemplate(data);

    // Email options
    const mailOptions = {
      from: `${process.env.FROM_NAME || "Georgia Connects Hub"} <${
        process.env.FROM_EMAIL || process.env.SMTP_USER
      }>`,
      to: email,
      subject: emailTemplate.subject || subject,
      html: html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    logger.info("Email sent successfully", {
      to: email,
      subject: mailOptions.subject,
      messageId: info.messageId,
    });

    return info;
  } catch (error) {
    logger.error("Failed to send email", {
      to: email,
      template,
      error: error.message,
    });
    throw error;
  }
};

// Send bulk emails
export const sendBulkEmail = async (emails, template, data = {}) => {
  const results = [];

  for (const email of emails) {
    try {
      const result = await sendEmail({ email, template, data });
      results.push({ email, success: true, messageId: result.messageId });
    } catch (error) {
      results.push({ email, success: false, error: error.message });
    }
  }

  return results;
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info("Email configuration is valid");
    return true;
  } catch (error) {
    logger.error("Email configuration test failed:", error);
    return false;
  }
};

export default {
  sendEmail,
  sendBulkEmail,
  testEmailConfig,
};
