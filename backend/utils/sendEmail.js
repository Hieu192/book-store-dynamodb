const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const sendEmail = async (options) => {
  try {
    // Use environment variables for credentials
    const GOOGLE_MAILER_CLIENT_ID = process.env.GOOGLE_MAILER_CLIENT_ID;
    const GOOGLE_MAILER_CLIENT_SECRET = process.env.GOOGLE_MAILER_CLIENT_SECRET;
    const GOOGLE_MAILER_REFRESH_TOKEN = process.env.GOOGLE_MAILER_REFRESH_TOKEN;
    const ADMIN_EMAIL_ADDRESS = process.env.ADMIN_EMAIL_ADDRESS;

    // Validate required environment variables
    if (!GOOGLE_MAILER_CLIENT_ID || !GOOGLE_MAILER_CLIENT_SECRET || 
        !GOOGLE_MAILER_REFRESH_TOKEN || !ADMIN_EMAIL_ADDRESS) {
      throw new Error('Email configuration is missing. Please check environment variables.');
    }

    const myOAuth2Client = new OAuth2Client(
      GOOGLE_MAILER_CLIENT_ID,
      GOOGLE_MAILER_CLIENT_SECRET
    );

    myOAuth2Client.setCredentials({
      refresh_token: GOOGLE_MAILER_REFRESH_TOKEN
    });

    const myAccessTokenObject = await myOAuth2Client.getAccessToken();
    const myAccessToken = myAccessTokenObject?.token;

    if (!myAccessToken) {
      throw new Error('Failed to get access token from Google OAuth2');
    }

    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: ADMIN_EMAIL_ADDRESS,
        clientId: GOOGLE_MAILER_CLIENT_ID,
        clientSecret: GOOGLE_MAILER_CLIENT_SECRET,
        refresh_token: GOOGLE_MAILER_REFRESH_TOKEN,
        accessToken: myAccessToken
      }
    });

    const mailOptions = {
      from: ADMIN_EMAIL_ADDRESS,
      to: options.email,
      subject: options.subject,
      text: options.message
    };

    // Use promise instead of callback
    const info = await transport.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};

module.exports = sendEmail;