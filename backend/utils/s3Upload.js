/**
 * ============================================================================
 * AWS S3 UPLOAD UTILITY
 * ============================================================================
 * 
 * Thay thế Cloudinary bằng AWS S3 để upload images
 * 
 * FEATURES:
 * - Upload single/multiple images
 * - Delete images
 * - Generate unique filenames
 * - Support base64 images
 * - Auto-detect content type
 * 
 * CONFIGURATION:
 * - AWS_REGION: Region của S3 bucket
 * - AWS_ACCESS_KEY_ID: AWS access key
 * - AWS_SECRET_ACCESS_KEY: AWS secret key
 * - S3_BUCKET_NAME: Tên S3 bucket
 * 
 * @example
 * const { uploadImage, deleteImage } = require('./s3Upload');
 * 
 * // Upload image
 * const result = await uploadImage(base64Image, 'products');
 * // { public_id: 'products/uuid.jpg', url: 'https://...' }
 * 
 * // Delete image
 * await deleteImage('products/uuid.jpg');
 */

const AWS = require('aws-sdk');

// Generate UUID v4 without external package
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Cấu hình AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'book-store-hieu-workshop';

/**
 * Upload image lên S3
 * 
 * @param {string} base64Image - Base64 encoded image hoặc buffer
 * @param {string} folder - Folder trong S3 (products, categories, avatars)
 * @returns {Promise<Object>} { public_id, url }
 * 
 * @example
 * const result = await uploadImage(base64Image, 'products');
 * console.log(result.url); // https://bucket.s3.amazonaws.com/products/uuid.jpg
 */
const uploadImage = async (base64Image, folder = 'images') => {
  try {
    // Parse base64 image
    let buffer;
    let contentType = 'image/jpeg';

    if (typeof base64Image === 'string') {
      // Extract content type from base64 string
      const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      
      if (matches && matches.length === 3) {
        contentType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        // Plain base64 without data URI
        buffer = Buffer.from(base64Image, 'base64');
      }
    } else {
      buffer = base64Image;
    }

    // Generate unique filename
    const fileExtension = contentType.split('/')[1] || 'jpg';
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    // Upload to S3
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType
      // Không dùng ACL vì bucket có thể disable ACLs
      // Public access được control bởi Bucket Policy
    };

    const result = await s3.upload(params).promise();

    // Generate thumbnail URL (Lambda sẽ tự động tạo vào folder thumbnails/)
    // Nếu upload vào products/, thumbnail sẽ ở thumbnails/
    let thumbnailUrl = null;
    if (folder === 'products') {
      const thumbnailKey = fileName.replace('products/', 'thumbnails/');
      thumbnailUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${thumbnailKey}`;
    }

    return {
      public_id: fileName,
      url: result.Location,
      ...(thumbnailUrl && { thumbnail: thumbnailUrl }) // Chỉ thêm thumbnail nếu là products
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

/**
 * Upload nhiều images cùng lúc
 * 
 * @param {Array<string>} images - Array of base64 images
 * @param {string} folder - Folder trong S3
 * @returns {Promise<Array<Object>>} Array of { public_id, url }
 * 
 * @example
 * const results = await uploadMultipleImages([img1, img2], 'products');
 * console.log(results); // [{ public_id, url }, { public_id, url }]
 */
const uploadMultipleImages = async (images, folder = 'images') => {
  try {
    const uploadPromises = images.map(image => uploadImage(image, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('S3 Multiple Upload Error:', error);
    throw new Error(`Failed to upload images: ${error.message}`);
  }
};

/**
 * Xóa image từ S3
 * 
 * @param {string} publicId - Public ID của image (fileName trong S3)
 * @returns {Promise<void>}
 * 
 * @example
 * await deleteImage('products/uuid.jpg');
 */
const deleteImage = async (publicId) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: publicId
    };

    await s3.deleteObject(params).promise();
    console.log(`✅ Deleted image: ${publicId}`);
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Xóa nhiều images cùng lúc
 * 
 * @param {Array<string>} publicIds - Array of public IDs
 * @returns {Promise<void>}
 * 
 * @example
 * await deleteMultipleImages(['products/uuid1.jpg', 'products/uuid2.jpg']);
 */
const deleteMultipleImages = async (publicIds) => {
  try {
    if (!publicIds || publicIds.length === 0) return;

    const params = {
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: publicIds.map(id => ({ Key: id })),
        Quiet: false
      }
    };

    const result = await s3.deleteObjects(params).promise();
    console.log(`✅ Deleted ${result.Deleted.length} images`);
  } catch (error) {
    console.error('S3 Multiple Delete Error:', error);
    throw new Error(`Failed to delete images: ${error.message}`);
  }
};

/**
 * Get signed URL cho private images (nếu cần)
 * 
 * @param {string} publicId - Public ID của image
 * @param {number} expiresIn - Thời gian hết hạn (seconds), default 3600 (1 hour)
 * @returns {Promise<string>} Signed URL
 * 
 * @example
 * const url = await getSignedUrl('products/uuid.jpg', 3600);
 */
const getSignedUrl = async (publicId, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: publicId,
      Expires: expiresIn
    };

    return await s3.getSignedUrlPromise('getObject', params);
  } catch (error) {
    console.error('S3 Signed URL Error:', error);
    throw new Error(`Failed to get signed URL: ${error.message}`);
  }
};

/**
 * Check if image exists in S3
 * 
 * @param {string} publicId - Public ID của image
 * @returns {Promise<boolean>}
 * 
 * @example
 * const exists = await imageExists('products/uuid.jpg');
 */
const imageExists = async (publicId) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: publicId
    };

    await s3.headObject(params).promise();
    return true;
  } catch (error) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
};

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getSignedUrl,
  imageExists
};
