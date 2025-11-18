// Mock Cloudinary for testing
const cloudinary = {
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn().mockResolvedValue({
        public_id: 'test_public_id_' + Date.now(),
        secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        url: 'https://res.cloudinary.com/test/image/upload/test.jpg'
      }),
      destroy: jest.fn().mockResolvedValue({
        result: 'ok'
      })
    }
  }
};

module.exports = cloudinary;
