// backend/test-cloudinary.js
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testUpload() {
  try {
    // Test upload with a sample image
    // Create a simple test image if you don't have one
    const result = await cloudinary.uploader.upload(
      'https://picsum.photos/200/300',
      {
        folder: 'test',
        public_id: 'test-upload',
      }
    );
    console.log('✅ Upload successful!');
    console.log('📁 Public ID:', result.public_id);
    console.log('🔗 URL:', result.secure_url);
    return result;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    console.error('Please check your Cloudinary credentials');
  }
}

testUpload();