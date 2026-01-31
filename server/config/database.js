const mongoose = require('mongoose');

// Prevent multiple connection attempts
let isConnecting = false;
let connectionAttempts = 0;
let isConnected = false;
const MAX_CONNECTION_ATTEMPTS = 3;

// Global database connection status
global.dbConnected = false;

const connectDB = async () => {
  // If already connected, return true
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting) {
    // Silent in production
    return false;
  }

  // Limit connection attempts to prevent infinite retries
  if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    // Only warn in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠ Maximum database connection attempts reached. Running in offline mode.');
    }
    return false;
  }

  isConnecting = true;
  connectionAttempts++;

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview-prep';

    // Log connection details in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB] Attempting MongoDB connection...');
      console.log('[DB] URI present:', !!process.env.MONGODB_URI);
      console.log('[DB] Using URI:', mongoURI.includes('mongodb.net') ? 'MongoDB Atlas' : 'Local MongoDB');
    }

    // Determine if connecting to MongoDB Atlas (contains mongodb.net or mongodb+srv)
    const isAtlas = mongoURI.includes('mongodb.net') || mongoURI.includes('mongodb+srv');

    // Base connection options
    const connectionOptions = {
      serverSelectionTimeoutMS: 30000, // Increased from 10s to 30s for Atlas
      socketTimeoutMS: 60000, // Increased from 45s to 60s
      connectTimeoutMS: 30000, // Explicit connection timeout
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      bufferCommands: true,
      retryWrites: true,
      retryReads: true,
      // Add heartbeat to detect connection issues faster
      heartbeatFrequencyMS: 10000,
    };

    // Add SSL options only for MongoDB Atlas
    if (isAtlas) {
      connectionOptions.ssl = true;
      connectionOptions.tlsAllowInvalidCertificates = true; // Replaces deprecated sslValidate
      connectionOptions.family = 4; // Force IPv4 for Atlas
    }

    // Connect to MongoDB (timeout is handled by serverSelectionTimeoutMS)
    const conn = await mongoose.connect(mongoURI, connectionOptions);

    // Reset connection attempts on success
    connectionAttempts = 0;
    isConnected = true;
    global.dbConnected = true;

    if (process.env.NODE_ENV === 'development') {
      console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
      console.log(`✓ Database: ${conn.connection.name}`);
    }
    return true;
  } catch (error) {
    isConnected = false;
    global.dbConnected = false;

    // Log errors in development with full details
    if (process.env.NODE_ENV === 'development') {
      console.error('✗ MongoDB connection failed:', error.message);
      console.error('[DB] Error details:', {
        name: error.name,
        code: error.code,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n') // First 3 lines of stack
      });
      
      // Check if it's a timeout
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        console.error('[DB] Connection timeout - check:');
        console.error('  1. Internet connection');
        console.error('  2. MongoDB Atlas network access (IP whitelist)');
        console.error('  3. Firewall settings');
      }
      
      // Check if it's authentication
      if (error.message.includes('authentication') || error.code === 8000) {
        console.error('[DB] Authentication failed - check:');
        console.error('  1. MongoDB username/password in MONGODB_URI');
        console.error('  2. Database user permissions');
      }
      
      console.warn('⚠ Starting server without MongoDB. Questions will not persist.');
    }
    return false;
  } finally {
    isConnecting = false;
  }
};

// Graceful connection cleanup
process.on('SIGINT', async () => {
  // Silent in production
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  // Silent in production
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = connectDB;