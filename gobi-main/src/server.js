const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { specs, swaggerUi } = require('./swagger');

// Load environment variables
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan('combined')); // Logging
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check the health status of the API service
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Tenant Management API'
  });
});

// Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Tenant Management API Documentation'
}));

// Import routes
const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const phoneNumberRoutes = require('./routes/phoneNumbers');
const campaignRoutes = require('./routes/campaigns');
const platformTrunkRoutes = require('./routes/platformTrunks');
const livekitTrunkRoutes = require('./routes/livekitTrunks');
const agentRoutes = require('./routes/agents');
const leadListRoutes = require('./routes/leadLists');
const phoneNumberSyncRoutes = require('./routes/phoneNumberSync');

// Import services
const PhoneNumberSyncService = require('./services/PhoneNumberSyncService');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/tenants', phoneNumberRoutes);
app.use('/api/tenants', campaignRoutes);
app.use('/api/platform-trunks', platformTrunkRoutes);
app.use('/api/livekit-trunks', livekitTrunkRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/lead-lists', leadListRoutes);
app.use('/api', phoneNumberSyncRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use('/{*any}', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  PhoneNumberSyncService.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  PhoneNumberSyncService.stop();
  await prisma.$disconnect();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);

  // Start background sync service (5 minute interval)
  console.log('Starting phone number sync service...');
  PhoneNumberSyncService.start(5 * 60 * 1000);
});

module.exports = app;