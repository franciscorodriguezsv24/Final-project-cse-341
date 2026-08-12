/**
 * Runs before any test file is loaded. NODE_ENV must be `test` before app.js is
 * required, because that is what makes it skip the MongoDB-backed session store
 * — the suite mocks the database and never opens a real connection.
 */
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-only-secret';
