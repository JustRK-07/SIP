const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter, passwordResetLimiter, registrationLimiter } = require('../middleware/rateLimiter');
const DatabaseService = require('../services/DatabaseService');
const ResponseService = require('../services/ResponseService');
const ValidationService = require('../services/ValidationService');

const router = express.Router();
const prisma = DatabaseService.getClient();

// Load RSA private key for signing tokens
// In production, this should be stored securely (e.g., AWS Secrets Manager, HashiCorp Vault)
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login to get access and refresh tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: User's email or username
 *                 example: qateam@ytel.com
 *               password:
 *                 type: string
 *                 description: User's password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT access token for API authentication
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token for getting new access tokens
 *                 tokenType:
 *                   type: string
 *                   description: Type of token (Bearer)
 *                   example: Bearer
 *                 firebaseToken:
 *                   type: string
 *                   nullable: true
 *                   description: Optional Firebase token for push notifications
 *       401:
 *         description: Invalid credentials
 *       400:
 *         description: Validation error
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return ResponseService.badRequest(res, 'Username and password are required');
    }

    // Find user in database
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username.toLowerCase() },
          { username: username.toLowerCase() }
        ],
        isActive: true
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true,
            isActive: true
          }
        }
      }
    });

    if (!user) {
      return ResponseService.unauthorized(res, 'Invalid credentials');
    }

    // Verify password (assuming password is hashed with bcrypt)
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return ResponseService.unauthorized(res, 'Invalid credentials');
    }

    // Check if user's tenant is active
    if (user.tenant && !user.tenant.isActive) {
      return ResponseService.forbidden(res, 'Your organization account is inactive');
    }

    // Generate user hash for token validation
    const uHash = crypto
      .createHash('sha512')
      .update(`${user.id}:${user.email}:${Date.now()}`)
      .digest('hex');

    // Convert BigInt permissions to numbers for JWT serialization
    const permissions = user.permissions ?
      user.permissions.map(p => Number(p)) :
      [8686796633, 536814048, 2097215]; // Default permissions

    // Prepare token payload
    const tokenPayload = {
      sub: user.id,
      uHash: uHash,
      pAcct: user.tenantId || user.tenant?.id,
      acct: user.tenantId || user.tenant?.id,
      privs: permissions,
      username: user.email || user.username,
      scope: 'ROLE_ACCESS_TOKEN',
      iss: process.env.JWT_ISSUER || 'https://ytel.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
    };

    // Generate access token
    const accessToken = jwt.sign(tokenPayload, JWT_PRIVATE_KEY, {
      algorithm: 'RS256'
    });

    // Generate refresh token with longer expiration
    const refreshTokenPayload = {
      ...tokenPayload,
      scope: 'ROLE_REFRESH_TOKEN',
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    const refreshToken = jwt.sign(refreshTokenPayload, JWT_PRIVATE_KEY, {
      algorithm: 'RS256'
    });

    // Store refresh token in database for validation
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    });

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Return tokens in the specified format
    res.json({
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      firebaseToken: null
    });

  } catch (error) {
    console.error('Login error:', error);
    ResponseService.internalError(res, error, 'Failed to authenticate');
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: New JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: New refresh token (optional)
 *                 tokenType:
 *                   type: string
 *                   example: Bearer
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseService.badRequest(res, 'Refresh token is required');
    }

    // Verify refresh token
    let decoded;
    try {
      const publicKey = process.env.JWT_PUBLIC_KEY;
      decoded = jwt.verify(refreshToken, publicKey, {
        algorithms: ['RS256']
      });
    } catch (error) {
      return ResponseService.unauthorized(res, 'Invalid or expired refresh token');
    }

    // Check if refresh token is in database and active
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        token: refreshToken,
        userId: decoded.sub,
        isActive: true,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                domain: true,
                isActive: true
              }
            }
          }
        }
      }
    });

    if (!storedToken) {
      return ResponseService.unauthorized(res, 'Invalid or expired refresh token');
    }

    // Convert BigInt permissions to numbers for JWT serialization
    const permissions = storedToken.user.permissions ?
      storedToken.user.permissions.map(p => Number(p)) :
      decoded.privs;

    // Generate new access token
    const tokenPayload = {
      sub: storedToken.user.id,
      uHash: decoded.uHash,
      pAcct: storedToken.user.tenantId,
      acct: storedToken.user.tenantId,
      privs: permissions,
      username: storedToken.user.email || storedToken.user.username,
      scope: 'ROLE_ACCESS_TOKEN',
      iss: process.env.JWT_ISSUER || 'https://ytel.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60) // 2 hours
    };

    const accessToken = jwt.sign(tokenPayload, JWT_PRIVATE_KEY, {
      algorithm: 'RS256'
    });

    res.json({
      accessToken,
      refreshToken: refreshToken, // Return same refresh token
      tokenType: 'Bearer',
      firebaseToken: null
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    ResponseService.internalError(res, error, 'Failed to refresh token');
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to invalidate
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user.id || req.user.sub;

    // Invalidate specific refresh token or all tokens for user
    if (refreshToken) {
      await prisma.refreshToken.updateMany({
        where: {
          token: refreshToken,
          userId: userId
        },
        data: {
          isActive: false
        }
      });
    } else {
      // Invalidate all refresh tokens for the user
      await prisma.refreshToken.updateMany({
        where: {
          userId: userId
        },
        data: {
          isActive: false
        }
      });
    }

    res.json({
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    ResponseService.internalError(res, error, 'Failed to logout');
  }
});

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate current access token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     acct:
 *                       type: string
 *       401:
 *         description: Invalid or expired token
 */
router.get('/validate', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.sub || req.user.id,
      username: req.user.username,
      acct: req.user.acct,
      privs: req.user.privs
    }
  });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: User's password (min 8 characters)
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               tenantId:
 *                 type: string
 *                 description: Tenant ID to associate user with
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post('/register', registrationLimiter, async (req, res) => {
  try {
    const { email, password, firstName, lastName, tenantId } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return ResponseService.badRequest(res, 'All fields are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ResponseService.badRequest(res, 'Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      return ResponseService.badRequest(res, 'Password must be at least 8 characters long');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return ResponseService.badRequest(res, 'User with this email already exists');
    }

    // Verify tenant exists if tenantId provided
    if (tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId }
      });

      if (!tenant) {
        return ResponseService.badRequest(res, 'Invalid tenant ID');
      }

      if (!tenant.isActive) {
        return ResponseService.forbidden(res, 'Tenant is not active');
      }
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: email.toLowerCase(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isActive: true,
        permissions: [], // Default empty permissions, admin can assign later
        tenantId: tenantId || null
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenant: user.tenant
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    ResponseService.internalError(res, error, 'Failed to register user');
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            domain: true
          }
        }
      }
    });

    if (!user) {
      return ResponseService.notFound(res, 'User not found');
    }

    res.json({
      data: user
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    ResponseService.internalError(res, error, 'Failed to fetch profile');
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { firstName, lastName, username } = req.body;

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();

    // Check username uniqueness if provided
    if (username !== undefined) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase(),
          id: { not: userId }
        }
      });

      if (existingUser) {
        return ResponseService.badRequest(res, 'Username already taken');
      }

      updateData.username = username.toLowerCase();
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        updatedAt: true
      }
    });

    res.json({
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Profile update error:', error);
    ResponseService.internalError(res, error, 'Failed to update profile');
  }
});

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send reset link
 *     responses:
 *       200:
 *         description: Reset email sent if user exists
 */
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return ResponseService.badRequest(res, 'Email is required');
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: 'If a user with this email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save reset token (expires in 1 hour)
    await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    // In production, send email with reset link
    // For now, log the token (in production, remove this)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password?token=${resetToken}`;
    console.log('Password reset URL:', resetUrl);

    // TODO: Implement email service
    // await EmailService.sendPasswordReset(user.email, resetUrl);

    res.json({
      message: 'If a user with this email exists, a password reset link has been sent.',
      // In development only - remove in production
      ...(process.env.NODE_ENV === 'development' && { resetToken, resetUrl })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    ResponseService.internalError(res, error, 'Failed to process password reset request');
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token from email
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (min 8 characters)
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return ResponseService.badRequest(res, 'Token and new password are required');
    }

    if (newPassword.length < 8) {
      return ResponseService.badRequest(res, 'New password must be at least 8 characters long');
    }

    // Hash the provided token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find valid reset token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    });

    if (!resetToken) {
      return ResponseService.badRequest(res, 'Invalid or expired reset token');
    }

    // Hash new password
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      }),
      // Invalidate all refresh tokens for security
      prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId },
        data: { isActive: false }
      })
    ]);

    res.json({
      message: 'Password has been reset successfully. Please login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    ResponseService.internalError(res, error, 'Failed to reset password');
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (min 8 characters)
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Current password is incorrect
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub || req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return ResponseService.badRequest(res, 'Current and new passwords are required');
    }

    if (newPassword.length < 8) {
      return ResponseService.badRequest(res, 'New password must be at least 8 characters long');
    }

    if (currentPassword === newPassword) {
      return ResponseService.badRequest(res, 'New password must be different from current password');
    }

    // Get user with current password hash
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return ResponseService.notFound(res, 'User not found');
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return ResponseService.unauthorized(res, 'Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    // Invalidate all refresh tokens for security
    await prisma.refreshToken.updateMany({
      where: { userId: userId },
      data: { isActive: false }
    });

    res.json({
      message: 'Password changed successfully. Please login again with your new password.'
    });

  } catch (error) {
    console.error('Password change error:', error);
    ResponseService.internalError(res, error, 'Failed to change password');
  }
});

module.exports = router;