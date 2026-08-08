require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const { initDb } = require('./config/db');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const swaggerDocument = require('./swagger/swagger.json');

const app = express();
const PORT = process.env.PORT || 8080;

// Render terminates TLS at its proxy; this makes req.protocol report https,
// and is what secure session cookies will need once OAuth is added.
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Serves the generated spec with host and scheme rewritten from the incoming
 * request, so the same swagger.json powers "Try it out" on both localhost and
 * the deployed Render URL without regenerating the file per environment.
 */
app.use(
  '/api-docs',
  swaggerUi.serve,
  (req, res, next) => {
    const forwardedProto = req.get('x-forwarded-proto');
    const liveDocument = {
      ...swaggerDocument,
      host: req.get('host'),
      schemes: [forwardedProto ? forwardedProto.split(',')[0] : req.protocol]
    };
    return swaggerUi.setup(liveDocument, {
      customSiteTitle: 'ConferenceHub API Docs'
    })(req, res, next);
  }
);

app.use('/', routes);

// Order matters: unmatched routes become a 404, then everything funnels into
// the single error handler that shapes the JSON response.
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Connect to MongoDB before accepting traffic, so no request can arrive while
 * getDb() would still throw.
 */
const start = async () => {
  try {
    await initDb();
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`ConferenceHub API listening on port ${PORT}`);
      console.log(`Documentation available at /api-docs`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();

module.exports = app;
