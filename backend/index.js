require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // Import the database connection
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const managerRoutes = require('./routes/managerRoutes'); 

const app = express();
app.use(cors());
app.use(express.json());

// Test database connection on startup
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('Database connected!');
  } catch (error) {
    console.error('Failed to connect to the database:', error.message);
    process.exit(1); // Exit the app if the database connection fails
  }
})();

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/manager', managerRoutes);

// Fallback route for unhandled requests
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3001; // Use PORT from .env or default to 3001
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
