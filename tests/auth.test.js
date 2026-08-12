const request = require('supertest');

jest.mock('../config/db');

const { getDb } = require('../config/db');
const app = require('../app');
const { createCollection, buildDb } = require('./helpers/mockDb');

/**
 * Proves the OAuth gate itself: every write route on all four collections is
 * unreachable without a session, and the guard runs before any database work.
 */

let collections;

beforeEach(() => {
  collections = {
    events: createCollection([]),
    speakers: createCollection([]),
    sessions: createCollection([]),
    registrations: createCollection([])
  };
  getDb.mockReturnValue(buildDb(collections));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /auth/status', () => {
  test('reports an anonymous visitor as not authenticated', async () => {
    const response = await request(app).get('/auth/status');

    expect(response.status).toBe(200);
    expect(response.body.authenticated).toBe(false);
    expect(response.body.user).toBeNull();
  });
});

describe('protected write routes', () => {
  const VALID_ID = '66b0f2c8a1d4e5f60912ab30';

  const protectedRoutes = [
    ['post', '/events'],
    ['put', `/events/${VALID_ID}`],
    ['delete', `/events/${VALID_ID}`],
    ['post', '/speakers'],
    ['put', `/speakers/${VALID_ID}`],
    ['delete', `/speakers/${VALID_ID}`],
    ['post', '/sessions'],
    ['put', `/sessions/${VALID_ID}`],
    ['delete', `/sessions/${VALID_ID}`],
    ['post', '/registrations'],
    ['put', `/registrations/${VALID_ID}`],
    ['delete', `/registrations/${VALID_ID}`]
  ];

  test.each(protectedRoutes)('%s %s returns 401 when signed out', async (method, route) => {
    const response = await request(app)[method](route).send({});

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toMatch(/Authentication required/);
  });

  test('rejects before running validation or touching the database', async () => {
    // A body this invalid would produce a 400 if validation ran first, and the
    // 401 confirms requireAuth is the outermost guard on the route.
    const response = await request(app).post('/events').send({ title: 'x' });

    expect(response.status).toBe(401);
    expect(collections.events.insertOne).not.toHaveBeenCalled();
    expect(collections.events.findOne).not.toHaveBeenCalled();
  });
});

describe('public read routes stay open', () => {
  test.each([['/events'], ['/speakers'], ['/sessions'], ['/registrations']])(
    'GET %s is reachable without signing in',
    async (route) => {
      const response = await request(app).get(route);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    }
  );
});
