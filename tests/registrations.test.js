const request = require('supertest');

jest.mock('../config/db');

const { getDb } = require('../config/db');
const app = require('../app');
const { createCollection, buildDb } = require('./helpers/mockDb');

const VALID_ID = '66b0f2c8a1d4e5f60912ab33';
const EVENT_ID = '66b0f2c8a1d4e5f60912ab30';

const REGISTRATION = {
  _id: VALID_ID,
  eventId: EVENT_ID,
  attendeeName: 'Diego Salazar',
  attendeeEmail: 'diego.salazar@example.com',
  ticketType: 'general',
  quantity: 2,
  amountPaid: 299.98,
  status: 'confirmed',
  registeredAt: '2026-08-11T12:00:00.000Z'
};

let registrations;
let events;

beforeEach(() => {
  registrations = createCollection([REGISTRATION]);
  events = createCollection([]);
  getDb.mockReturnValue(buildDb({ registrations, events }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /registrations', () => {
  test('returns 200 with every registration and a matching count', async () => {
    const response = await request(app).get('/registrations');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].attendeeEmail).toBe(REGISTRATION.attendeeEmail);
  });

  test('sorts newest first', async () => {
    const cursor = { sort: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) };
    registrations.find.mockReturnValue(cursor);

    await request(app).get('/registrations');

    expect(cursor.sort).toHaveBeenCalledWith({ registeredAt: -1 });
  });

  test('converts the eventId query parameter into an ObjectId filter', async () => {
    const response = await request(app).get(`/registrations?eventId=${EVENT_ID}`);

    expect(response.status).toBe(200);
    const filter = registrations.find.mock.calls[0][0];
    expect(filter.eventId.toString()).toBe(EVENT_ID);
  });

  test('filters by status when the query parameter is supplied', async () => {
    const response = await request(app).get('/registrations?status=confirmed');

    expect(response.status).toBe(200);
    expect(registrations.find).toHaveBeenCalledWith({ status: 'confirmed' });
  });

  test('rejects an unknown status with 400 without querying the database', async () => {
    const response = await request(app).get('/registrations?status=refunded');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('status');
    expect(registrations.find).not.toHaveBeenCalled();
  });
});

describe('GET /registrations/{registrationId}', () => {
  test('returns 200 with the registration when it exists', async () => {
    registrations.findOne.mockResolvedValue(REGISTRATION);

    const response = await request(app).get(`/registrations/${VALID_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.data.attendeeName).toBe('Diego Salazar');
  });

  test('returns 404 when no registration has that id', async () => {
    registrations.findOne.mockResolvedValue(null);

    const response = await request(app).get(`/registrations/${VALID_ID}`);

    expect(response.status).toBe(404);
    expect(response.body.error.status).toBe(404);
  });

  test('returns 400 for a malformed ObjectId instead of reaching the driver', async () => {
    const response = await request(app).get('/registrations/abc');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('registrationId');
    expect(registrations.findOne).not.toHaveBeenCalled();
  });
});
