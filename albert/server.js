const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const routes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const User = require('./models/User');
const { seedDatabase } = require('./seed');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', routes);

// SPA fallback for frontend
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();

  // Automatic seeding check: if fresh/empty DB, seed demo data immediately
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Startup] Fresh database detected. Auto-seeding initial demo data...');
      await seedDatabase(false);
      console.log('[Startup] Auto-seeding complete.');
    }
  } catch (seedErr) {
    console.warn('[Startup] Auto-seed check notice:', seedErr.message);
  }

  const PORT = config.PORT || 5000;
  const server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  P18 — Gym & Fitness Management Backend`);
    console.log(`  Environment: ${config.NODE_ENV}`);
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  API Base URL: http://localhost:${PORT}/api`);
    console.log(`====================================================`);
  });

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };