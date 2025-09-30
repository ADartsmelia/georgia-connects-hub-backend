import fs from 'fs';
import path from 'path';

// Read the current QR route file
const qrRoutePath = './src/routes/qr.js';
let content = fs.readFileSync(qrRoutePath, 'utf8');

// Replace the attachments section
const oldAttachments = `      // Prepare attachment
      const attachments = [
        {
          filename: \`networking-georgia-qr-\${code}.png\`,
          content: qrCodeBuffer,
          contentType: "image/png",
          cid: "qr-code-image",
        },
      ];`;

const newAttachments = `      // Prepare attachment
      const attachments = [
        {
          filename: \`networking-georgia-qr-\${code}.png\`,
          content: qrCodeBuffer,
          contentType: "image/png",
          cid: "qr-code-image",
        },
        {
          filename: "banner.png",
          path: path.join(__dirname, "../../email-assets/banner.png"),
          cid: "banner-image",
        },
        {
          filename: "logo.png",
          path: path.join(__dirname, "../../email-assets/logo.png"),
          cid: "main-logo",
        },
      ];`;

content = content.replace(oldAttachments, newAttachments);

// Write back to file
fs.writeFileSync(qrRoutePath, content);
console.log('✅ QR route updated with local asset paths');
