// Mock sendEmail for testing
const sendEmail = jest.fn().mockResolvedValue(true);

module.exports = sendEmail;
