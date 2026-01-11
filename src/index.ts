import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8086;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers

// Configuración de CORS que maneja múltiples orígenes
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000'];

// Debug: mostrar orígenes permitidos al iniciar
console.log('🌐 CORS - Orígenes permitidos:', allowedOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Debug: mostrar el origen recibido
    console.log(`🔍 CORS - Origen recibido: ${origin || 'sin origen'}`);
    
    // Permitir requests sin origen (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS - Permitiendo request sin origen');
      return callback(null, true);
    }
    
    // Verificar si el origen está permitido
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS - Origen permitido: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`❌ CORS - Origen bloqueado: ${origin}`);
      console.warn(`   Orígenes permitidos: ${allowedOrigins.join(', ')}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(morgan('combined')); // Logging

// Middleware para parsear JSON de manera más flexible
app.use(express.json({ 
  limit: '10mb',
  strict: false, // Permitir JSON no estricto
  type: ['application/json', 'application/*+json', 'text/json', '*/*'] // Aceptar diferentes tipos
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  type: 'application/x-www-form-urlencoded'
}));
app.use(cookieParser());

// Debug middleware for CORS and requests
app.use((req, res, next) => {
  // Log CORS-related headers
  if (req.method === 'OPTIONS') {
    console.log('=== CORS PREFLIGHT REQUEST ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Origin:', req.get('origin'));
    console.log('Access-Control-Request-Method:', req.get('access-control-request-method'));
    console.log('Access-Control-Request-Headers:', req.get('access-control-request-headers'));
  }
  
  // Log request body for PUT/POST
  if (req.method === 'PUT' || req.method === 'POST') {
    console.log('=== REQUEST DEBUG ===');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    console.log('Origin:', req.get('origin'));
    console.log('Content-Type:', req.get('content-type'));
    console.log('Body received:', JSON.stringify(req.body, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Body is array?', Array.isArray(req.body));
    if (req.body) {
      console.log('Body keys:', Object.keys(req.body));
    }
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'MF Computers API is running',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Import API routes
import apiRoutes from './routes';

// Mount API routes
app.use('/api', apiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err);
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Server will not start.');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`🚀 MF Computers API Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();
