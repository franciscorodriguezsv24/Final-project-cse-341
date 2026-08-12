const request = require('supertest');

jest.mock('../config/db');

/**
 * The OAuth handshake itself cannot run in a unit test, so requireAuth is
 * replaced by a stub that attaches a user. That leaves the write routes free to
 * be tested for what they actually do once someone is signed in: validation,
 * referential checks, and the conflict rules. The real gate is covered
 * separately in auth.test.js.
 */
const SIGNED_IN_USER = { _id: '66b0f2c8a1d4e5f60912ab34', displayName: 'Test Organizer' };

jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = { _id: '66b0f2c8a1d4e5f60912ab34', displayName: 'Test Organizer' };
    next();
  }
}));

const { getDb } = require('../config/db');
const app = require('../app');
const { createCollection, createCursor, buildDb } = require('./helpers/mockDb');

const EVENT_ID = '66b0f2c8a1d4e5f60912ab30';
const SPEAKER_ID = '66b0f2c8a1d4e5f60912ab31';
const SESSION_ID = '66b0f2c8a1d4e5f60912ab32';
const REGISTRATION_ID = '66b0f2c8a1d4e5f60912ab33';

const validSession = () => ({
  eventId: EVENT_ID,
  speakerId: SPEAKER_ID,
  title: 'Designing REST APIs that survive real clients',
  description: 'A practical hour on resource modelling, status codes and validation.',
  startTime: '2026-09-14T10:00:00.000Z',
  endTime: '2026-09-14T11:00:00.000Z',
  room: 'Hall B',
  track: 'backend',
  capacity: 120
});

const validRegistration = () => ({
  eventId: EVENT_ID,
  attendeeName: 'Diego Salazar',
  attendeeEmail: 'diego.salazar@example.com',
  ticketType: 'general',
  quantity: 2,
  amountPaid: 299.98,
  status: 'confirmed'
});

const validEvent = () => ({
  title: 'BYU Pathway Developer Summit 2026',
  description: 'A three-day conference covering web development and career growth.',
  startDate: '2026-09-14T09:00:00.000Z',
  endDate: '2026-09-16T17:00:00.000Z',
  location: 'Salt Palace Convention Center',
  capacity: 500,
  category: 'technology',
  ticketPrice: 149.99,
  status: 'published'
});

let events;
let speakers;
let sessions;
let registrations;

beforeEach(() => {
  events = createCollection([]);
  speakers = createCollection([]);
  sessions = createCollection([]);
  registrations = createCollection([]);
  getDb.mockReturnValue(buildDb({ events, speakers, sessions, registrations }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('POST /events', () => {
  test('creates the event and returns 201', async () => {
    events.insertOne.mockResolvedValue({ insertedId: 'new-event-id' });

    const response = await request(app).post('/events').send(validEvent());

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Event created');
    expect(events.insertOne).toHaveBeenCalledTimes(1);
  });

  test('takes the organizer from the session when the body omits it', async () => {
    events.insertOne.mockResolvedValue({ insertedId: 'new-event-id' });

    await request(app).post('/events').send(validEvent());

    const stored = events.insertOne.mock.calls[0][0];
    expect(stored.organizerId.toString()).toBe(SIGNED_IN_USER._id);
  });

  test('returns 400 when the event ends before it starts', async () => {
    const response = await request(app)
      .post('/events')
      .send({ ...validEvent(), endDate: '2026-09-13T09:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('endDate');
    expect(events.insertOne).not.toHaveBeenCalled();
  });
});

describe('PUT /events/{eventId}', () => {
  test('preserves createdAt and the original organizer', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    events.findOne.mockResolvedValue({ _id: EVENT_ID, createdAt, organizerId: SPEAKER_ID });

    const response = await request(app).put(`/events/${EVENT_ID}`).send(validEvent());

    expect(response.status).toBe(200);
    const stored = events.replaceOne.mock.calls[0][1];
    expect(stored.createdAt).toEqual(createdAt);
    expect(stored.organizerId.toString()).toBe(SPEAKER_ID);
  });

  test('returns 404 when the event does not exist', async () => {
    events.findOne.mockResolvedValue(null);

    const response = await request(app).put(`/events/${EVENT_ID}`).send(validEvent());

    expect(response.status).toBe(404);
    expect(events.replaceOne).not.toHaveBeenCalled();
  });
});

describe('POST /speakers', () => {
  test('returns 409 when the email is already taken', async () => {
    speakers.findOne.mockResolvedValue({ _id: SPEAKER_ID });

    const response = await request(app).post('/speakers').send({
      firstName: 'Marta',
      lastName: 'Contreras',
      email: 'marta.contreras@example.com',
      organization: 'Northwind Labs',
      jobTitle: 'Principal Engineer',
      bio: 'Marta has spent twelve years building distributed systems.',
      photoUrl: 'https://example.com/photos/marta.jpg'
    });

    expect(response.status).toBe(409);
    expect(speakers.insertOne).not.toHaveBeenCalled();
  });
});

describe('POST /sessions', () => {
  const bothReferencesExist = () => {
    events.findOne.mockResolvedValue({ _id: EVENT_ID });
    speakers.findOne.mockResolvedValue({ _id: SPEAKER_ID });
  };

  test('creates the session and returns 201 when both references exist', async () => {
    bothReferencesExist();
    sessions.findOne.mockResolvedValue(null);
    sessions.insertOne.mockResolvedValue({ insertedId: SESSION_ID });

    const response = await request(app).post('/sessions').send(validSession());

    expect(response.status).toBe(201);
    expect(response.body.data._id).toBe(SESSION_ID);
  });

  test('returns 400 naming every reference that does not exist', async () => {
    events.findOne.mockResolvedValue(null);
    speakers.findOne.mockResolvedValue(null);

    const response = await request(app).post('/sessions').send(validSession());

    expect(response.status).toBe(400);
    const fields = response.body.error.details.map((detail) => detail.field);
    expect(fields).toEqual(['eventId', 'speakerId']);
    expect(sessions.insertOne).not.toHaveBeenCalled();
  });

  test('returns 409 when the room is already booked for that slot', async () => {
    bothReferencesExist();
    sessions.findOne.mockResolvedValue({ _id: 'other-session', title: 'Opening keynote' });

    const response = await request(app).post('/sessions').send(validSession());

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/already booked/);
    expect(sessions.insertOne).not.toHaveBeenCalled();
  });

  test('returns 400 when the talk ends before it starts', async () => {
    const response = await request(app)
      .post('/sessions')
      .send({ ...validSession(), endTime: '2026-09-14T09:00:00.000Z' });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('endTime');
  });
});

describe('POST /registrations', () => {
  test('creates the registration and returns 201 when seats remain', async () => {
    events.findOne.mockResolvedValue({ _id: EVENT_ID, capacity: 100 });
    registrations.findOne.mockResolvedValue(null);
    registrations.aggregate.mockReturnValue(createCursor([{ _id: null, seatsTaken: 10 }]));
    registrations.insertOne.mockResolvedValue({ insertedId: REGISTRATION_ID });

    const response = await request(app).post('/registrations').send(validRegistration());

    expect(response.status).toBe(201);
    expect(response.body.data._id).toBe(REGISTRATION_ID);
  });

  test('returns 400 when the event does not exist', async () => {
    events.findOne.mockResolvedValue(null);

    const response = await request(app).post('/registrations').send(validRegistration());

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('eventId');
    expect(registrations.insertOne).not.toHaveBeenCalled();
  });

  test('returns 409 when that attendee already registered for the event', async () => {
    events.findOne.mockResolvedValue({ _id: EVENT_ID, capacity: 100 });
    registrations.findOne.mockResolvedValue({ _id: 'existing-registration' });

    const response = await request(app).post('/registrations').send(validRegistration());

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/already registered/);
  });

  test('returns 409 when the requested tickets exceed the seats left', async () => {
    events.findOne.mockResolvedValue({ _id: EVENT_ID, capacity: 100 });
    registrations.findOne.mockResolvedValue(null);
    registrations.aggregate.mockReturnValue(createCursor([{ _id: null, seatsTaken: 99 }]));

    const response = await request(app).post('/registrations').send(validRegistration());

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/Only 1 of 100 seat/);
    expect(registrations.insertOne).not.toHaveBeenCalled();
  });

  test('lets a cancelled registration through without checking capacity', async () => {
    events.findOne.mockResolvedValue({ _id: EVENT_ID, capacity: 1 });
    registrations.findOne.mockResolvedValue(null);
    registrations.insertOne.mockResolvedValue({ insertedId: REGISTRATION_ID });

    const response = await request(app)
      .post('/registrations')
      .send({ ...validRegistration(), status: 'cancelled' });

    expect(response.status).toBe(201);
    expect(registrations.aggregate).not.toHaveBeenCalled();
  });

  test('returns 400 when amountPaid is negative', async () => {
    const response = await request(app)
      .post('/registrations')
      .send({ ...validRegistration(), amountPaid: -10 });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('amountPaid');
  });
});

describe('DELETE /sessions/{sessionId}', () => {
  test('deletes an existing session and returns 200', async () => {
    sessions.findOne.mockResolvedValue({ _id: SESSION_ID });

    const response = await request(app).delete(`/sessions/${SESSION_ID}`);

    expect(response.status).toBe(200);
    expect(sessions.deleteOne).toHaveBeenCalledTimes(1);
  });

  test('returns 404 when the session does not exist', async () => {
    sessions.findOne.mockResolvedValue(null);

    const response = await request(app).delete(`/sessions/${SESSION_ID}`);

    expect(response.status).toBe(404);
    expect(sessions.deleteOne).not.toHaveBeenCalled();
  });
});
