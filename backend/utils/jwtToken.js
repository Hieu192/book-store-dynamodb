const jwt = require('jsonwebtoken');

// Create and send token and save in the cookie.
const sendToken = (user, statusCode, res) => {
    // Create Jwt token
    // Support both MongoDB model (with getJwtToken method) and plain objects
    let token;
    if (typeof user.getJwtToken === 'function') {
        token = user.getJwtToken();
    } else {
        // Generate token manually for DynamoDB users
        token = jwt.sign(
            { id: user._id || user.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: process.env.JWT_EXPIRES_TIME }
        );
    }

    // Options for cookie
    const options = {
        expires: new Date(
            Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'PRODUCTION',
        sameSite: 'strict'
    }

    res.status(statusCode).cookie('token', token, options).json({
        success: true,
        token,
        user
    })
}

module.exports = sendToken;