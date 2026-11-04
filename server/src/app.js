const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Route registration
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
