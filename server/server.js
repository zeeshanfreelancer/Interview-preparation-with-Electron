const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

// Load .env file - explicitly specify path to ensure it's found
const envPath = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });

// Import database connection
const connectDB = require('./config/database');

// Default languages configuration
const DEFAULT_LANGUAGES = ['React', 'JavaScript', 'HTML', 'CSS'];

// Import routes
const questionRoutes = require('./routes/questions');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Rate limiting variables
let requestCount = 0;
let lastResetTime = Date.now();
const REQUEST_LIMIT = 1000; // requests per minute
const RESET_INTERVAL = 60000; // 1 minute

// Connect to database (don't exit if it fails)
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging and rate limiting (only in development)
if (!isProduction) {
  app.use((req, res, next) => {
    const now = Date.now();

    // Reset counter every minute
    if (now - lastResetTime > RESET_INTERVAL) {
      requestCount = 0;
      lastResetTime = now;
    }

    // Simple rate limiting
    if (requestCount > REQUEST_LIMIT) {
      return res.status(429).json({ message: 'Too many requests' });
    }

    requestCount++;
    // Logging removed in production to prevent disk space issues
    if (!isProduction && req.path.startsWith('/api/') && req.path !== '/api/health') {
      // Only log every 10th request to reduce spam
      if (requestCount % 10 === 0) {
        console.log(`${req.method} ${req.path} (${requestCount} requests this minute)`);
      }
    }
    next();
  });
}

// Routes
app.use('/api/questions', questionRoutes);

// Get all languages (direct route for compatibility)
app.get('/api/languages', async (req, res) => {
  try {
    // Check if database is connected
    if (!global.dbConnected || mongoose.connection.readyState !== 1) {
      // Return default languages if database is not connected
      return res.json(DEFAULT_LANGUAGES);
    }

    const Question = require('./models/Question');
    const languages = await Question.distinct('language');
    res.json(languages || []);
  } catch (error) {
    // Logging removed in production
    if (!isProduction) {
      console.error('Error fetching languages:', error.message);
    }
    // Return defaults on any database error
    res.json(DEFAULT_LANGUAGES);
  }
});

// Store the actual port being used
let actualServerPort = null;

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    port: actualServerPort || parseInt(process.env.PORT) || 3000,
    database: {
      connected: global.dbConnected || false,
      readyState: mongoose.connection.readyState || 0,
      readyStateText: mongoose.connection.readyState === 1 ? 'connected' : 
                      mongoose.connection.readyState === 2 ? 'connecting' :
                      mongoose.connection.readyState === 3 ? 'disconnecting' : 'disconnected'
    },
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const Question = require('./models/Question');
    const totalQuestions = await Question.countDocuments();
    const questionsByLanguage = await Question.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } }
    ]);
    
    res.json({
      connected: global.dbConnected && mongoose.connection.readyState === 1,
      readyState: mongoose.connection.readyState,
      totalQuestions,
      questionsByLanguage: questionsByLanguage.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    });
  } catch (error) {
    res.json({
      connected: false,
      error: error.message,
      totalQuestions: 0,
      questionsByLanguage: {}
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Logging removed in production to prevent disk space issues
  if (!isProduction) {
    console.error('[API Error]', err.message);
  }
  res.status(500).json({ message: 'Internal server error' });
});

// Start server on the port specified in .env file
const startServer = async () => {
  const portToUse = parseInt(process.env.PORT) || 3000;

  try {
    const server = app.listen(portToUse, () => {
      actualServerPort = portToUse; // Store the actual port being used
      console.log(`✓ Server running on port ${portToUse} (from .env)`);
      console.log(`✓ API available at http://localhost:${portToUse}/api`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle port already in use error
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n✗ ERROR: Port ${portToUse} is already in use!`);
        console.error(`\nPlease do one of the following:`);
        console.error(`1. Stop the other application using port ${portToUse}`);
        console.error(`2. Change PORT in your .env file to a different port`);
        console.error(`3. Find and kill the process using port ${portToUse}:`);
        console.error(`   Windows: netstat -ano | findstr :${portToUse}`);
        console.error(`   Then: taskkill /PID <PID> /F\n`);
        process.exit(1);
      } else {
        throw err;
      }
    });

    // Update the API base URL for the client
    process.env.PORT = portToUse;

    // Handle graceful shutdown
    const gracefulShutdown = () => {
      if (!isProduction) {
        console.log('Shutting down server gracefully...');
      }
      server.close(() => {
        if (!isProduction) {
          console.log('Server closed');
        }
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      // Always log port errors (critical)
      console.error(`\n✗ ERROR: Port ${portToUse} is already in use!`);
      console.error(`\nPlease do one of the following:`);
      console.error(`1. Stop the other application using port ${portToUse}`);
      console.error(`2. Change PORT in your .env file to a different port`);
      console.error(`3. Find and kill the process using port ${portToUse}:`);
      console.error(`   Windows: netstat -ano | findstr :${portToUse}`);
      console.error(`   Then: taskkill /PID <PID> /F\n`);
    } else {
      // Only log other errors in development
      if (!isProduction) {
        console.error('Failed to start server:', error.message);
      }
    }
    process.exit(1);
  }
};

// Start the server
startServer();

// Memory monitoring removed - was causing performance issues in production