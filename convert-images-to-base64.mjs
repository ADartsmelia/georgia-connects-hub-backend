#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

async function convertImagesToBase64() {
  try {
    console.log('🖼️  Converting email assets to base64...');

    // Convert banner to base64
    const bannerPath = path.join('email-assets', 'banner.png');
    if (fs.existsSync(bannerPath)) {
      const bannerBuffer = fs.readFileSync(bannerPath);
      const bannerBase64 = bannerBuffer.toString('base64');
      const bannerDataURL = `data:image/png;base64,${bannerBase64}`;
      
      console.log('✅ Banner converted to base64');
      console.log(`📏 Banner size: ${Math.round(bannerDataURL.length / 1024)}KB`);
      
      // Save to file for use in email template
      fs.writeFileSync('banner-base64.txt', bannerDataURL);
    }

    // Convert logo to base64
    const logoPath = path.join('email-assets', 'logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      const logoBase64 = logoBuffer.toString('base64');
      const logoDataURL = `data:image/png;base64,${logoBase64}`;
      
      console.log('✅ Logo converted to base64');
      console.log(`📏 Logo size: ${Math.round(logoDataURL.length / 1024)}KB`);
      
      // Save to file for use in email template
      fs.writeFileSync('logo-base64.txt', logoDataURL);
    }

    console.log('🎉 Base64 conversion complete!');
    console.log('📁 Files created: banner-base64.txt, logo-base64.txt');
    
  } catch (error) {
    console.error('❌ Error converting images:', error);
    process.exit(1);
  }
}

convertImagesToBase64();
