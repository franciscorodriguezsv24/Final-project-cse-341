const request = require('supertest');

jest.mock('../config/db');

const { getDb } = require('../config/db');
const app = require('../app');
const { createCollection, buildDb } = require('./helpers/mockDb');

const VALID_ID = '66b0f2c8a1d4e5f60912ab31';

const SPEAKER = {
  _id: VALID_ID,
  firstName: 'Marta',
  lastName: 'Contreras',
  email: 'marta.contreras@example.com',
  organization: 'Northwind Labs',
  jobTitle: 'Principal Engineer',
  bio: 'Marta has spent twelve years building distributed systems.',
  photoUrl: 'https://example.com/photos/marta-contreras.jpg'
};

let speakers;
let sessions;

beforeEach(() => {
  speakers = createCollection([SPEAKER]);
  sessions = createCollection([]);
  getDb.mockReturnValue(buildDb({ speakers, sessions }));
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('GET /speakers', () => {
  test('returns 200 with every speaker and a matching count', async () => {
    const response = await request(app).get('/speakers');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].email).toBe(SPEAKER.email);
  });

  test('sorts by last name then first name so the list is stable', async () => {
    const cursor = { sort: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([]) };
    speakers.find.mockReturnValue(cursor);

    await request(app).get('/speakers');

    expect(cursor.sort).toHaveBeenCalledWith({ lastName: 1, firstName: 1 });
  });

  test('filters by organization when the query parameter is supplied', async () => {
    const response = await request(app).get('/speakers?organization=Northwind%20Labs');

    expect(response.status).toBe(200);
    expect(speakers.find).toHaveBeenCalledWith({ organization: 'Northwind Labs' });
  });
});

describe('GET /speakers/{speakerId}', () => {
  test('returns 200 with the speaker when it exists', async () => {
    speakers.findOne.mockResolvedValue(SPEAKER);

    const response = await request(app).get(`/speakers/${VALID_ID}`);

    expect(response.status).toBe(200);
    expect(response.body.data.firstName).toBe('Marta');
  });

  test('returns 404 when no speaker has that id', async () => {
    speakers.findOne.mockResolvedValue(null);

    const response = await request(app).get(`/speakers/${VALID_ID}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('returns 400 for a malformed ObjectId instead of reaching the driver', async () => {
    const response = await request(app).get('/speakers/12345');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('speakerId');
    expect(speakers.findOne).not.toHaveBeenCalled();
  });
});

describe('GET /speakers/{speakerId}/sessions', () => {
  test('returns 200 with the sessions assigned to the speaker', async () => {
    speakers.findOne.mockResolvedValue(SPEAKER);
    sessions.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([{ _id: 'session-1', title: 'Scaling Node APIs' }])
    });

    const response = await request(app).get(`/speakers/${VALID_ID}/sessions`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.data[0].title).toBe('Scaling Node APIs');
  });

  test('returns 404 when the speaker does not exist', async () => {
    speakers.findOne.mockResolvedValue(null);

    const response = await request(app).get(`/speakers/${VALID_ID}/sessions`);

    expect(response.status).toBe(404);
    expect(sessions.find).not.toHaveBeenCalled();
  });
});
