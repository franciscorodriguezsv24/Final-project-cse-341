require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
// connect-mongo v6 is dual ESM/CJS and exposes the store as a named export;
// the default import that older guides use is undefined here.
const { MongoStore } = require('connect-mongo');
const swaggerUi = require('swagger-ui-express');

const { passport, configurePassport } = require('./config/passport');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const swaggerDocument = require('./swagger/swagger.json');

const app = express();

// Render terminates TLS at its proxy; this makes req.protocol report https and
// is what lets the secure session cookie below be set at all.
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

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.SESSION_SECRET) {
  console.warn('SESSION_SECRET is not set in production - sessions will not survive a restart.');
}

/**
 * Sessions live in MongoDB rather than in memory, so a login survives Render
 * restarting the free-tier instance. Tests run without a database, so they fall
 * back to the default in-memory store.
 */
const sessionStore =
  process.env.MONGODB_URI && process.env.NODE_ENV !== 'test'
    ? MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: process.env.MONGODB_DB_NAME || 'conferencehub',
        collectionName: 'sessions_store',
        ttl: 24 * 60 * 60
      })
    : undefined;

app.use(
  session({
    name: 'conferencehub.sid',
    secret: process.env.SESSION_SECRET || 'insecure-development-secret',
    resave: false,
    // Nothing is stored until someone actually logs in, so anonymous browsing
    // of the docs never creates a session row.
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      // Render serves over https; localhost does not, and a secure cookie there
      // would simply never be sent back.
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

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
      customSiteTitle: 'ConferenceHub API Docs',
      // Without this, "Try it out" drops the session cookie and every protected
      // route answers 401 even when the browser is signed in.
      swaggerOptions: { withCredentials: true }
    })(req, res, next);
  }
);

app.use('/', routes);

// Order matters: unmatched routes become a 404, then everything funnels into
// the single error handler that shapes the JSON response.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
