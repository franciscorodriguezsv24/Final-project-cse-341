const request = require('supertest');

jest.mock('../config/db');

const { getDb } = require('../config/db');
const app = require('../app');
const { createCollection, buildDb } = require('./helpers/mockDb');

const VALID_ID = '66b0f2c8a1d4e5f60912ab30';

const EVENT = {
  _id: VALID_ID,
  title: 'BYU Pathway Developer Summit 2026',
  description: 'A three-day conference covering web development and career growth.',
  startDate: '2026-09-14T09:00:00.000Z',
  endDate: '2026-09-16T17:00:00.000Z',
  location: 'Salt Palace Convention Center',
  capacity: 500,
  category: 'technology',
  ticketPrice: 149.99,
  status: 'published',
  organizerId: '66b0f2c8a1d4e5f60912ab34',
  createdAt: '2026-08-06T12:00:00.000Z'
};

let events;
let sessions;
let registrations;

beforeEach(() => {
  events = createCollection([EVENT]);
  sessions = createCollection([]);
  registrations = createCollection([]);
  getDb.mockReturnValue(buildDb({ events, sessions, registrations }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /events', () => {
  test('returns 200 with every event and a matching count', async () => {
    const response = await request(app).get('/events');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].title).toBe(EVENT.title);
  });

  test('passes the status and category query parameters through as a filter', async () => {
    const response = await request(app).get('/events?status=published&category=technology');

    expect(response.status).toBe(200);
    expect(events.find).toHaveBeenCalledWith({ status: 'published', category: 'technology' });
  });

  test('rejects an unknown status with 400 without querying the database', async () => {
    const response = await request(app).get('/events?status=not-a-status');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Validation failed');
    expect(response.body.error.details[0].field).toBe('status');
    expect(events.find).not.toHaveBeenCalled();
  });
});

describe('GET /events/findByCategory', () => {
  test('returns 200 with the events in the requested category', async () => {
    const response = await request(app).get('/events/findByCategory?category=technology');

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(events.find).toHaveBeenCalledWith({ category: 'technology' });
  });

  test('returns 400 when the category is missing', async () => {
    const response = await request(app).get('/events/findByCategory');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('category');
  });
});

describe('GET /events/{eventId}', () => {
  test('returns 200 with the event when it exists', async () => {
    events.findOne.mockResolvedValue(EVENT);

    const response = await request(app).get(`/events/${VALID_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.data._id).toBe(VALID_ID);
  });

  test('returns 404 when no event has that id', async () => {
    events.findOne.mockResolvedValue(null);

    const response = await request(app).get(`/events/${VALID_ID}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.status).toBe(404);
  });

  test('returns 400 for a malformed ObjectId instead of reaching the driver', async () => {
    const response = await request(app).get('/events/not-an-object-id');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('eventId');
    expect(events.findOne).not.toHaveBeenCalled();
  });
});

describe('GET /events/{eventId}/sessions', () => {
  test('returns 200 with the sessions belonging to the event', async () => {
    events.findOne.mockResolvedValue(EVENT);
    sessions.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([{ _id: 'session-1', title: 'Opening keynote' }])
    });

    const response = await request(app).get(`/events/${VALID_ID}/sessions`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].title).toBe('Opening keynote');
  });

  test('returns 404 when the parent event does not exist', async () => {
    events.findOne.mockResolvedValue(null);

    const response = await request(app).get(`/events/${VALID_ID}/sessions`);

    expect(response.status).toBe(404);
    expect(sessions.find).not.toHaveBeenCalled();
  });
});
