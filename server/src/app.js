const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const deadlineRoutes = require('./routes/deadlineRoutes');
const pushRoutes = require('./routes/pushRoutes');

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

// Root welcoming endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Kheyal API',
    tagline: 'Plan Smart. Move Forward. / Socho. Plan karo. Kar dikhao.',
    status: 'running',
    frontend: frontendOrigin,
    health: '/health',
  });
});

// Route registration
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/deadlines', deadlineRoutes);
app.use('/push', pushRoutes);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
