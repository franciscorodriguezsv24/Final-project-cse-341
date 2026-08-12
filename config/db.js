const { MongoClient } = require('mongodb');

let client;
let database;

/**
 * Opens one shared connection at startup and reuses it for every request,
 * instead of reconnecting per request as described in the project proposal.
 */
const initDb = async () => {
  if (database) {
    return database;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(process.env.MONGODB_DB_NAME || 'conferencehub');

  await createIndexes(database);

  return database;
};

/**
 * Indexes backing the queries and uniqueness rules each collection relies on.
 * Created at startup so a fresh database is correct without a manual step.
 */
const createIndexes = async (db) => {
  await db.collection('events').createIndex({ startDate: 1 });
  await db.collection('speakers').createIndex({ email: 1 }, { unique: true });

  await db.collection('sessions').createIndex({ eventId: 1, startTime: 1 });
  await db.collection('sessions').createIndex({ speakerId: 1 });

  // The controller checks for a duplicate registration to return a clear 409;
  // this index is what actually enforces it under concurrent requests.
  await db
    .collection('registrations')
    .createIndex({ eventId: 1, attendeeEmail: 1 }, { unique: true });

  await db.collection('users').createIndex({ githubId: 1 }, { unique: true });
};

/**
 * Returns the connected database. Throws when called before initDb() so a
 * misordered startup fails loudly instead of producing confusing undefined errors.
 */
const getDb = () => {
  if (!database) {
    throw new Error('Database not initialized. Call initDb() before getDb().');
  }
  return database;
};

const closeDb = async () => {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
};

module.exports = { initDb, getDb, closeDb };
