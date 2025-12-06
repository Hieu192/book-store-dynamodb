/**
 * Auth Controller (Refactored)
 * Uses UserService instead of direct Model access
 */

const ErrorHandler = require('../utils/errorHandler');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const sendToken = require('../utils/jwtToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { uploadImage, deleteImage } = require('../utils/s3Upload');
const userService = require('../services/UserService');

// Register a user => /api/v1/register
exports.registerUser = catchAsyncErrors(async (req, res, next) => {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
        return next(new ErrorHandler('Please enter name, email and password', 400));
    }

    let avatar = undefined;

    // Upload avatar if provided
    if (req.body.avatar) {
        const result = await uploadImage(req.body.avatar, 'avatars');
        avatar = {
            public_id: result.public_id,
            url: result.url
        };
    }

    const user = await userService.createUser({
        name,
        email,
        password,
        ...(avatar && { avatar })
    });

    // Remove password from response
    if (user.password) user.password = undefined;

    sendToken(user, 200, res);
});

// Login User => /api/v1/login
exports.loginUser = catchAsyncErrors(async (req, res, next) => {
    const { email, password } = req.body;

    // Checks if email and password is entered by user
    if (!email || !password) {
        return next(new ErrorHandler('Please enter email & password', 400));
    }

    // Finding user in database with password
    const user = await userService.getUserByEmailWithPassword(email);

    if (!user) {
        return next(new ErrorHandler('Invalid Email or Password', 401));
    }

    // Checks if password is correct or not
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
        return next(new ErrorHandler('Invalid Email or Password', 401));
    }

    // Remove password from response
    user.password = undefined;

    sendToken(user, 200, res);
});

// Login with Google => /api/v1/loginWithGoogle
exports.loginWithGoogle = catchAsyncErrors(async (req, res, next) => {
    const { email, picture, name } = req.body;
    const account = await userService.getUserByEmail(email);

    if (!account) {
        try {
            const user = await userService.createUser({
                name,
                email,
                avatar: {
                    url: picture
                }
            });

            // Remove password from response
            if (user.password) user.password = undefined;

            sendToken(user, 200, res);
        } catch (err) {
            console.log(err);
            return next(new ErrorHandler('Error creating user', 500));
        }
    } else {
        sendToken(account, 200, res);
    }
});

// Forgot Password => /api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors(async (req, res, next) => {
    const user = await userService.getUserByEmail(req.body.email);

    if (!user) {
        return next(new ErrorHandler('User not found with this email', 404));
    }

    // Get reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash and set to resetPasswordToken
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set token expire time (30 minutes)
    const resetPasswordExpire = Date.now() + 30 * 60 * 1000;

    await userService.updateUser(user.id || user._id, {
        resetPasswordToken,
        resetPasswordExpire
    });

    // Create reset password url
    const resetUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

    const message = `Your password reset token is as follow:\n\n${resetUrl}\n\nIf you have not requested this email, then ignore it.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'ShopIT Password Recovery',
            message
        });

        res.status(200).json({
            success: true,
            message: `Email sent to: ${user.email}`
        });

    } catch (error) {
        await userService.updateUser(user.id || user._id, {
            resetPasswordToken: undefined,
            resetPasswordExpire: undefined
        });

        return next(new ErrorHandler(error.message, 500));
    }
});

// Reset Password => /api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors(async (req, res, next) => {
    // Hash URL token
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    // Find user with valid token
    const users = await userService.getAllUsers();
    const user = users.find(u =>
        u.resetPasswordToken === resetPasswordToken &&
        u.resetPasswordExpire > Date.now()
    );

    if (!user) {
        return next(new ErrorHandler('Password reset token is invalid or has been expired', 400));
    }

    if (req.body.password !== req.body.confirmPassword) {
        return next(new ErrorHandler('Password does not match', 400));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    // Update user
    await userService.updateUser(user.id || user._id, {
        password: hashedPassword,
        resetPasswordToken: undefined,
        resetPasswordExpire: undefined
    });

    const updatedUser = await userService.getUser(user.id || user._id);
    if (updatedUser.password) updatedUser.password = undefined;

    sendToken(updatedUser, 200, res);
});

// Get currently logged in user details => /api/v1/me
exports.getUserProfile = catchAsyncErrors(async (req, res) => {
    const user = await userService.getUser(req.user.id);

    res.status(200).json({
        success: true,
        user
    });
});

// Update / Change password => /api/v1/password/update
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
    const user = await userService.getUserWithPassword(req.user.id);

    // Check previous user password
    const isMatched = await bcrypt.compare(req.body.oldPassword, user.password);
    if (!isMatched) {
        return next(new ErrorHandler('Old password is incorrect'));
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    await userService.updateUser(req.user.id, {
        password: hashedPassword
    });

    const updatedUser = await userService.getUser(req.user.id);
    if (updatedUser.password) updatedUser.password = undefined;

    sendToken(updatedUser, 200, res);
});

// Update user profile => /api/v1/me/update
exports.updateProfile = catchAsyncErrors(async (req, res, next) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email
    };

    // Update avatar
    if (req.body.avatar && req.body.avatar !== '') {
        const user = await userService.getUser(req.user.id);

        const image_id = user.avatar?.public_id;
        if (image_id) {
            await deleteImage(image_id);
        }

        const result = await uploadImage(req.body.avatar, 'avatars');

        newUserData.avatar = {
            public_id: result.public_id,
            url: result.url
        };
    }

    await userService.updateUser(req.user.id, newUserData);

    res.status(200).json({
        success: true
    });
});

// Logout user => /api/v1/logout
exports.logout = catchAsyncErrors(async (req, res) => {
    res.cookie('token', null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'PRODUCTION',
        sameSite: 'strict'
    });

    res.status(200).json({
        success: true,
        message: 'Logged out'
    });
});

// Admin Routes

// Get all users => /api/v1/admin/users
exports.allUsers = catchAsyncErrors(async (req, res) => {
    const users = await userService.getAllUsers();

    res.status(200).json({
        success: true,
        users
    });
});

// Get user details => /api/v1/admin/user/:id
exports.getUserDetails = catchAsyncErrors(async (req, res, next) => {
    const user = await userService.getUser(req.params.id);

    if (!user) {
        return next(new ErrorHandler(`User does not found with id: ${req.params.id}`));
    }

    res.status(200).json({
        success: true,
        user
    });
});

// Update user profile => /api/v1/admin/user/:id
exports.updateUser = catchAsyncErrors(async (req, res) => {
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role
    };

    await userService.updateUser(req.params.id, newUserData);

    res.status(200).json({
        success: true
    });
});

// Delete user => /api/v1/admin/user/:id
exports.deleteUser = catchAsyncErrors(async (req, res, next) => {
    const user = await userService.getUser(req.params.id);

    if (!user) {
        return next(new ErrorHandler(`User does not found with id: ${req.params.id}`));
    }

    // Remove avatar from S3
    const image_id = user.avatar?.public_id;
    if (image_id) {
        await deleteImage(image_id);
    }

    await userService.deleteUser(req.params.id);

    res.status(200).json({
        success: true,
    });
});
