const app = require('./app');
const { initDb } = require('./config/db');

const PORT = process.env.PORT || 8080;

/**
 * Connect to MongoDB before accepting traffic, so no request can arrive while
 * getDb() would still throw. The app itself lives in app.js so the test suite
 * can import it without opening a port or a database connection.
 */
const start = async () => {
  try {
    await initDb();
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`ConferenceHub API listening on port ${PORT}`);
      console.log('Documentation available at /api-docs');
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();

module.exports = app;
