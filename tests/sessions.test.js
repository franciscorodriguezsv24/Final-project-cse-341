const request = require('supertest');

jest.mock('../config/db');

const { getDb } = require('../config/db');
const app = require('../app');
const { createCollection, buildDb } = require('./helpers/mockDb');

const VALID_ID = '66b0f2c8a1d4e5f60912ab32';
const EVENT_ID = '66b0f2c8a1d4e5f60912ab30';
const SPEAKER_ID = '66b0f2c8a1d4e5f60912ab31';

const SESSION = {
  _id: VALID_ID,
  eventId: EVENT_ID,
  speakerId: SPEAKER_ID,
  title: 'Designing REST APIs that survive contact with real clients',
  description: 'A practical hour on resource modelling, status codes and validation.',
  startTime: '2026-09-14T10:00:00.000Z',
  endTime: '2026-09-14T11:00:00.000Z',
  room: 'Hall B',
  track: 'backend',
  capacity: 120,
  createdAt: '2026-08-11T12:00:00.000Z'
};

let sessions;
let events;
let speakers;

beforeEach(() => {
  sessions = createCollection([SESSION]);
  events = createCollection([]);
  speakers = createCollection([]);
  getDb.mockReturnValue(buildDb({ sessions, events, speakers }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /sessions', () => {
  test('returns 200 with every session and a matching count', async () => {
    const response = await request(app).get('/sessions');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].title).toBe(SESSION.title);
  });

  test('sorts by start time so the schedule reads in order', async () => {
    const cursor = { sort: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) };
    sessions.find.mockReturnValue(cursor);

    await request(app).get('/sessions');

    expect(cursor.sort).toHaveBeenCalledWith({ startTime: 1 });
  });

  test('converts the eventId query parameter into an ObjectId filter', async () => {
    const response = await request(app).get(`/sessions?eventId=${EVENT_ID}`);

    expect(response.status).toBe(200);
    const filter = sessions.find.mock.calls[0][0];
    expect(filter.eventId.toString()).toBe(EVENT_ID);
  });

  test('filters by track when the query parameter is supplied', async () => {
    const response = await request(app).get('/sessions?track=backend');

    expect(response.status).toBe(200);
    expect(sessions.find).toHaveBeenCalledWith({ track: 'backend' });
  });

  test('rejects an unknown track with 400 without querying the database', async () => {
    const response = await request(app).get('/sessions?track=underwater-basket-weaving');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('track');
    expect(sessions.find).not.toHaveBeenCalled();
  });
});

describe('GET /sessions/{sessionId}', () => {
  test('returns 200 with the session when it exists', async () => {
    sessions.findOne.mockResolvedValue(SESSION);

    const response = await request(app).get(`/sessions/${VALID_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.data.room).toBe('Hall B');
  });

  test('returns 404 when no session has that id', async () => {
    sessions.findOne.mockResolvedValue(null);

    const response = await request(app).get(`/sessions/${VALID_ID}`);

    expect(response.status).toBe(404);
    expect(response.body.error.status).toBe(404);
  });

  test('returns 400 for a malformed ObjectId instead of reaching the driver', async () => {
    const response = await request(app).get('/sessions/nope');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('sessionId');
    expect(sessions.findOne).not.toHaveBeenCalled();
  });
});
