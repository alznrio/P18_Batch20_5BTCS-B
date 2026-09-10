const mongoose = require('mongoose');
const config = require('./env');

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    // Attempt connecting to the configured MONGO_URI with a 2-second server selection timeout
    console.log(`[Database] Attempting connection to ${config.MONGO_URI}...`);
    await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] MongoDB Connected: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`[Database] Could not connect to external MongoDB at ${config.MONGO_URI}: ${err.message}`);
    console.log('[Database] Starting in-memory MongoDB server (mongodb-memory-server) for zero-setup execution...');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      console.log(`[Database] In-memory MongoDB started at: ${memoryUri}`);

      await mongoose.connect(memoryUri);
      console.log('[Database] Successfully connected to In-memory MongoDB instance!');
    } catch (memErr) {
      console.error('[Database] Failed to launch in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
    }
    console.log('[Database] MongoDB disconnected cleanly.');
  } catch (err) {
    console.error('[Database] Error during disconnect:', err);
  }
};

module.exports = { connectDB, disconnectDB };