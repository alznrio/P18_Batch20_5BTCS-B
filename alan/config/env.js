const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/gym_fitness_db',
  JWT_SECRET: process.env.JWT_SECRET || 'gym_super_secret_jwt_key_christ_university_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};