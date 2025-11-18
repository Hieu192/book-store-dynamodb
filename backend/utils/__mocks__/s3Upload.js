/**
 * Mock S3 Upload for testing
 * Không thực sự upload lên S3 trong tests
 */

const uploadImage = jest.fn(async (base64Image, folder = 'images') => {
  return {
    public_id: `${folder}/test-${Date.now()}.jpg`,
    url: `https://test-bucket.s3.amazonaws.com/${folder}/test-${Date.now()}.jpg`
  };
});

const uploadMultipleImages = jest.fn(async (images, folder = 'images') => {
  return images.map((_, index) => ({
    public_id: `${folder}/test-${Date.now()}-${index}.jpg`,
    url: `https://test-bucket.s3.amazonaws.com/${folder}/test-${Date.now()}-${index}.jpg`
  }));
});

const deleteImage = jest.fn(async (publicId) => {
  return true;
});

const deleteMultipleImages = jest.fn(async (publicIds) => {
  return true;
});

const getSignedUrl = jest.fn(async (publicId, expiresIn = 3600) => {
  return `https://test-bucket.s3.amazonaws.com/${publicId}?signed=true`;
});

const imageExists = jest.fn(async (publicId) => {
  return true;
});

module.exports = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getSignedUrl,
  imageExists
};
