/**
 * Test doubles for the MongoDB driver.
 *
 * These are unit tests: they exercise routing, validation and controller logic
 * without a database, so they run identically on a laptop with no `.env` and in
 * CI. Each test file mocks `config/db` and feeds `getDb` one of these fakes.
 */

/**
 * Mimics the chainable cursor returned by `find()` and `aggregate()`, so
 * `collection().find(...).sort(...).toArray()` resolves to the given documents.
 */
const createCursor = (documents = []) => {
  const cursor = {
    sort: jest.fn(() => cursor),
    limit: jest.fn(() => cursor),
    project: jest.fn(() => cursor),
    toArray: jest.fn(async () => documents)
  };
  return cursor;
};

/**
 * A single fake collection. `find` and `aggregate` default to returning the
 * documents handed in, and every method is a jest mock so a test can assert on
 * the exact filter the controller built.
 */
const createCollection = (documents = []) => ({
  find: jest.fn(() => createCursor(documents)),
  aggregate: jest.fn(() => createCursor([])),
  findOne: jest.fn(async () => null),
  countDocuments: jest.fn(async () => 0),
  insertOne: jest.fn(async () => ({ insertedId: 'inserted-id' })),
  replaceOne: jest.fn(async () => ({ modifiedCount: 1 })),
  deleteOne: jest.fn(async () => ({ deletedCount: 1 }))
});

/**
 * Builds the object `getDb()` returns. Asking for a collection the test did not
 * set up throws instead of silently returning undefined, so an unexpected
 * database call fails loudly rather than as a confusing TypeError.
 */
const buildDb = (collections) => ({
  collection: (name) => {
    if (!collections[name]) {
      throw new Error(`Test did not provide a mock for the "${name}" collection`);
    }
    return collections[name];
  }
});

module.exports = { createCursor, createCollection, buildDb };
