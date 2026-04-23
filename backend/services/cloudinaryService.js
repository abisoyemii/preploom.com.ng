const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class CloudinaryService {
  static async uploadAudio(buffer, userId, examType) {
    const public_id = `speaking/${examType}/${userId}/${Date.now()}`;
    
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'preploom/speaking',
          public_id,
          format: 'mp3'
        },
        (error, result) => {
          if (error) reject(new Error('Cloudinary upload failed'));
          else resolve(result.secure_url);
        }
      ).end(buffer);
    });
  }
}

module.exports = CloudinaryService;
