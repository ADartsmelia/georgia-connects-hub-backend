import fs from 'fs';

// Read the email template file
const emailPath = './src/utils/email.js';
let content = fs.readFileSync(emailPath, 'utf8');

// Replace banner placeholder with image
const oldBanner = `            <!-- Banner Image Placeholder -->
            <div class="banner" style="background: linear-gradient(135deg, #1e40af, #3b82f6); height: 200px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
              🎟️ Networking Georgia 2025
            </div>`;

const newBanner = `            <!-- Banner Image -->
            <img src="cid:banner-image" alt="Networking Georgia Banner" class="banner">`;

content = content.replace(oldBanner, newBanner);

// Replace logo placeholder with image
const oldLogo = `            <div class="logo" style="background: linear-gradient(135deg, #1e40af, #3b82f6); height: 60px; width: 120px; display: flex; align-items: center; justify-content: center; color: white; font-size: 16px; font-weight: bold; margin: 20px auto; border-radius: 8px;">
              NG
            </div>`;

const newLogo = `            <img src="cid:main-logo" alt="Networking Georgia Logo" class="logo">`;

content = content.replace(oldLogo, newLogo);

// Write back to file
fs.writeFileSync(emailPath, content);
console.log('✅ Email template updated with image references');
