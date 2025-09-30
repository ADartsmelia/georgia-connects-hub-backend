import sgMail from "@sendgrid/mail";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
  qrCodePass: {
    subject: "Your Networking Georgia Event Pass - QR Code Attached",
    template: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Event Pass</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { padding: 30px; background: #f8fafc; border-radius: 0 0 10px 10px; }
          .qr-section { text-align: center; margin: 30px 0; padding: 20px; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .pass-info { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0284c7; }
          .instructions { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 14px; }
          .highlight { color: #1e40af; font-weight: bold; }
          .pass-type { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
          .day-pass { background: #dbeafe; color: #1e40af; }
          .full-pass { background: #ede9fe; color: #7c3aed; }
          .banner { width: 100%; max-width: 100%; height: auto; margin-bottom: 20px; border-radius: 8px; }
          .logo { width: 120px; height: auto; margin: 20px 0; }
          .link { color: #1e40af; text-decoration: underline; }
          .georgian-text { font-size: 16px; line-height: 1.8; margin: 20px 0; }
          .important-info { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .contact-info { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎟️ Networking Georgia</h1>
            <h2>Your Event Pass is Ready!</h2>
          </div>
          <div class="content">
            <!-- Banner Image -->
            <img src="cid:banner-image" alt="Networking Georgia Banner" class="banner">
            
            <div class="georgian-text">
              <h2>მოგესალმებით,</h2>
              
              <p>უპირველეს ყოვლისა, დიდი მადლობა ჩვენს ღონისძიებაში მონაწილეობისთვის!</p>
              
              <p>მოუთმენლად ველით თქვენთან შეხვედრას და გიზიარებთ ყველა საჭირო დეტალს იმისათვის, რომ თქვენი გამოცდილება Networking Georgia 2025-ზე იყოს მაქსიმალურად პროდუქტიული და საინტერესო.</p>
              
              <p>სრულყოფილი ნეთვორქინგისთვის <a href="https://app.networkinggeorgia.com/" class="link">გთხოვთ, დარეგისტრირდეთ მოცემულ ბმულზე</a>. ეს მოგცემთ შესაძლებლობას: დარეგისტრირდეთ ვორკფებსა და სესიებზე; პირადად დაეკონტაქტოთ არსებულ კომპანიებს და განავითაროთ პარტნიორობა ღონისძიების დასრულების შემდეგაც.</p>
              
              <div class="important-info">
                <h3>მნიშვნელოვანი ინფორმაცია ჩამოსვლისთვის:</h3>
                <p>გთხოვთ, გაითვალისწინოთ შემდეგი:</p>
                
                <p><strong>ტრანსპორტი:</strong> თუ ღონისძიების ფარგლებში გამოყოფილი ტრანსპორტით მოდიხართ: ავტობუსი გადის ზუსტად 08:30 საათზე ექსპო ჯორჯიას პარკინგიდან. დაგვიანების შემთხვევაში, გთხოვთ, დაგვიკავშირდეთ ნომერზე: <strong>595 171 771</strong></p>
                
                <p><strong>რეგისტრაცია:</strong> ჩამოსვლისთანავე, გთხოვთ, გაიაროთ რეგისტრაცია და მიიღოთ თქვენთვის განკუთვნილი მონაწილის ბეიჯი.</p>
                
                <p><strong>შეკრების ადგილი:</strong> რეგისტრაციის შემდეგ, გთხოვთ, პირდაპირ გადაინაცვლოთ ამფითეატრის გარე ტერიტორიაზე, სადაც უფრო დეტალურად გაგაცნობთ ღონისძიების მიმდინარეობას.</p>
              </div>
              
              <h3>Agenda, რუკა და ვორქშოფები/სესიები:</h3>
              <p><strong>დღის წესრიგი და რუკა:</strong> თანდართულ ფაილებად გიზიარებთ ღონისძიების დეტალურ დღის წესრიგს და რუკას.</p>
              
              <p><strong>ვორქშოფები და სესიები:</strong> <a href="https://app.networkinggeorgia.com/" class="link">ვორქშოფებსა და სესიებზე გთხოვთ დარეგისტრირდეთ ზემოთ მოცემული ბმულის მეშვეობით</a>.</p>
              <p><em>გაითვალისწინეთ: ადგილები შეზღუდულია, ამიტომ მნიშვნელოვანია, წინასწარ დარეგისტრირდეთ, რათა სასურველ ვორქშოფზე ან სესიაზე მოხვდეთ.</em></p>
              
              <h3>ნეთვორქინგის შესაძლებლობები და გათამაშება</h3>
              <p>გარდა დღის წესრიგით გაწერილი აქტივობებისა, დაგეგმილია პარტნიორი კომპანიების მიერ ორგანიზებული არაერთი საინტერესო აქტივობა!</p>
              
              <p><strong>საჩუქრების გათამაშება:</strong> გირჩევთ, მაქსიმალურად ჩაერთოთ ყველა აქტივობაში, რათა დააგროვოთ გათამაშების ბილეთები და მოიგოთ ჩვენი პარტნიორების მიერ დაწესებული საინტერესო საჩუქრები, მათ შორის, Geosky-ის ვერტმფრენით გასეირნება!</p>
              
              <p><strong>მოუთმენლად ველით თქვენთან შეხვედრას!</strong></p>
              <p>პატივისცემით,</p>
            </div>
            
            <div class="pass-info">
              <h3>📋 Your QR Code Details</h3>
              <p><strong>Pass Type:</strong> 
                <span class="pass-type {{passTypeClass}}">
                  {{#if isDayPass}}🎫 Day Pass{{else}}🎟️ Full Event Pass{{/if}}
                </span>
              </p>
              <p><strong>QR Code:</strong> {{qrCode}}</p>
              <p><strong>Status:</strong> Active and ready to use</p>
            </div>

            <div class="qr-section">
              <h3>📱 Your QR Code</h3>
              <p>Your personalized QR code is attached to this email. Please save it to your phone or print it out.</p>
              <p><strong>Important:</strong> This QR code is unique to you and will be scanned at the event entrance.</p>
            </div>

            <div class="instructions">
              <h3>📝 How to Use Your Pass</h3>
              <ol>
                <li><strong>Save the QR Code:</strong> Download the attached QR code image to your phone</li>
                <li><strong>Bring Your Phone:</strong> Have the QR code ready on your device when you arrive</li>
                <li><strong>Event Check-in:</strong> Present your QR code at the registration desk</li>
                <li><strong>Enjoy the Event:</strong> Once scanned, you'll receive your event materials and access</li>
              </ol>
            </div>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3>⚠️ Important Reminders</h3>
              <ul>
                <li>This QR code can only be used once</li>
                <li>Keep your QR code secure and don't share it with others</li>
                <li>Arrive on time for the best networking experience</li>
                <li>Bring a valid ID for verification if requested</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <img src="cid:main-logo" alt="Networking Georgia Logo" class="logo">
            <p><strong>© 2025 Network Georgia. All rights reserved.</strong></p>
            <p>You're receiving this email because you registered for our event.</p>
            
            <div class="contact-info">
              <p><strong>Our mailing address is:</strong></p>
              <p>60 Petre Kavtaradze Street, Tbilisi, Georgia</p>
              
              <p><strong>Want to change how you receive these emails?</strong></p>
              <p>You can update your preferences or unsubscribe</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  },
};

// Send email function
export const sendEmail = async ({
  email,
  subject,
  template,
  data = {},
  attachments = [],
}) => {
  try {
    // Get template
    const emailTemplate = templates[template];
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    // Compile template
    const compiledTemplate = handlebars.compile(emailTemplate.template);
    const html = compiledTemplate(data);

    // Prepare attachments for SendGrid
    const sendGridAttachments = attachments.map(attachment => {
      if (attachment.path) {
        // Read file from path
        const fileContent = fs.readFileSync(attachment.path);
        return {
          content: fileContent.toString('base64'),
          filename: attachment.filename,
          type: attachment.contentType || 'image/png',
          disposition: 'attachment',
          contentId: attachment.cid
        };
      } else {
        // Use buffer content
        return {
          content: attachment.content.toString('base64'),
          filename: attachment.filename,
          type: attachment.contentType || 'image/png',
          disposition: 'attachment',
          contentId: attachment.cid
        };
      }
    });

    // SendGrid message
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_USER,
        name: process.env.SENDGRID_FROM_NAME || "Networking Georgia"
      },
      subject: emailTemplate.subject || subject,
      html: html,
      attachments: sendGridAttachments
    };

    // Send email via SendGrid
    const response = await sgMail.send(msg);

    logger.info("Email sent successfully via SendGrid", {
      to: email,
      subject: msg.subject,
      messageId: response[0].headers['x-message-id'],
      attachments: attachments.length,
    });

    return response[0];
  } catch (error) {
    logger.error("Failed to send email via SendGrid", {
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
    // Test SendGrid API key
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }
    
    logger.info("SendGrid configuration is valid");
    return true;
  } catch (error) {
    logger.error("SendGrid configuration test failed:", error);
    return false;
  }
};

export default {
  sendEmail,
  sendBulkEmail,
  testEmailConfig,
};
