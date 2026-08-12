require('dotenv').config();

const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'ConferenceHub API',
    version: '2.0.0',
    description:
      'REST API for organizing multi-day conferences and the events inside them. ' +
      'Four collections - events, speakers, sessions and registrations - each with full CRUD, ' +
      'request validation and centralized error handling.\n\n' +
      'GET routes are public. Every POST, PUT and DELETE requires a GitHub sign-in: ' +
      'open /auth/github in a browser tab, approve the app, and you are returned here with a ' +
      'session cookie that Try it out reuses automatically. /auth/status shows who you are and ' +
      '/auth/logout ends the session. Without it, protected routes answer 401.'
  },
  host: process.env.SWAGGER_HOST || 'localhost:8080',
  basePath: '/',
  schemes: [process.env.SWAGGER_SCHEME || 'http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    { name: 'Root', description: 'Service information and health' },
    { name: 'Auth', description: 'GitHub OAuth login, session status and logout' },
    { name: 'Events', description: 'Conference events (12-field collection)' },
    { name: 'Speakers', description: 'People who present at sessions (8-field collection)' },
    { name: 'Sessions', description: 'Individual talks inside an event (11-field collection)' },
    { name: 'Registrations', description: 'Attendee tickets for an event (9-field collection)' }
  ],
  definitions: {
    EventInput: {
      $title: 'BYU Pathway Developer Summit 2026',
      $description:
        'A three-day conference covering web development, cloud infrastructure and career growth.',
      $startDate: '2026-09-14T09:00:00.000Z',
      $endDate: '2026-09-16T17:00:00.000Z',
      $location: 'Salt Palace Convention Center, Salt Lake City, UT',
      $capacity: 500,
      $category: 'technology',
      $ticketPrice: 149.99,
      $status: 'published',
      organizerId: '66b0f2c8a1d4e5f60912ab34'
    },
    Event: {
      _id: '66b0f2c8a1d4e5f60912ab30',
      title: 'BYU Pathway Developer Summit 2026',
      description:
        'A three-day conference covering web development, cloud infrastructure and career growth.',
      startDate: '2026-09-14T09:00:00.000Z',
      endDate: '2026-09-16T17:00:00.000Z',
      location: 'Salt Palace Convention Center, Salt Lake City, UT',
      capacity: 500,
      category: 'technology',
      ticketPrice: 149.99,
      status: 'published',
      organizerId: '66b0f2c8a1d4e5f60912ab34',
      createdAt: '2026-08-06T12:00:00.000Z'
    },
    SpeakerInput: {
      $firstName: 'Marta',
      $lastName: 'Contreras',
      $email: 'marta.contreras@example.com',
      $organization: 'Northwind Labs',
      $jobTitle: 'Principal Engineer',
      $bio: 'Marta has spent twelve years building distributed systems and teaches backend design.',
      $photoUrl: 'https://example.com/photos/marta-contreras.jpg'
    },
    Speaker: {
      _id: '66b0f2c8a1d4e5f60912ab31',
      firstName: 'Marta',
      lastName: 'Contreras',
      email: 'marta.contreras@example.com',
      organization: 'Northwind Labs',
      jobTitle: 'Principal Engineer',
      bio: 'Marta has spent twelve years building distributed systems and teaches backend design.',
      photoUrl: 'https://example.com/photos/marta-contreras.jpg'
    },
    SessionInput: {
      $eventId: '66b0f2c8a1d4e5f60912ab30',
      $speakerId: '66b0f2c8a1d4e5f60912ab31',
      $title: 'Designing REST APIs that survive contact with real clients',
      $description:
        'A practical hour on resource modelling, status codes, validation and the errors that only show up in production.',
      $startTime: '2026-09-14T10:00:00.000Z',
      $endTime: '2026-09-14T11:00:00.000Z',
      $room: 'Hall B',
      $track: 'backend',
      $capacity: 120
    },
    Session: {
      _id: '66b0f2c8a1d4e5f60912ab32',
      eventId: '66b0f2c8a1d4e5f60912ab30',
      speakerId: '66b0f2c8a1d4e5f60912ab31',
      title: 'Designing REST APIs that survive contact with real clients',
      description:
        'A practical hour on resource modelling, status codes, validation and the errors that only show up in production.',
      startTime: '2026-09-14T10:00:00.000Z',
      endTime: '2026-09-14T11:00:00.000Z',
      room: 'Hall B',
      track: 'backend',
      capacity: 120,
      createdAt: '2026-08-11T12:00:00.000Z'
    },
    RegistrationInput: {
      $eventId: '66b0f2c8a1d4e5f60912ab30',
      $attendeeName: 'Diego Salazar',
      $attendeeEmail: 'diego.salazar@example.com',
      $ticketType: 'general',
      $quantity: 2,
      $amountPaid: 299.98,
      $status: 'confirmed'
    },
    Registration: {
      _id: '66b0f2c8a1d4e5f60912ab33',
      eventId: '66b0f2c8a1d4e5f60912ab30',
      attendeeName: 'Diego Salazar',
      attendeeEmail: 'diego.salazar@example.com',
      ticketType: 'general',
      quantity: 2,
      amountPaid: 299.98,
      status: 'confirmed',
      registeredAt: '2026-08-11T12:00:00.000Z'
    },
    AuthStatus: {
      success: true,
      authenticated: true,
      user: {
        _id: '66b0f2c8a1d4e5f60912ab34',
        githubId: '1234567',
        username: 'franciscorodriguezsv24',
        displayName: 'Alejandro Rodríguez',
        email: 'alejandro@example.com',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1234567'
      }
    },
    UnauthorizedError: {
      success: false,
      error: {
        status: 401,
        message: 'Authentication required. Sign in at /auth/github before writing data.'
      }
    },
    ValidationError: {
      success: false,
      error: {
        status: 400,
        message: 'Validation failed',
        details: [
          { field: 'capacity', message: 'capacity must be an integer between 1 and 100000', value: -5 }
        ]
      }
    },
    NotFoundError: {
      success: false,
      error: {
        status: 404,
        message: 'No event found with id 66b0f2c8a1d4e5f60912ab30'
      }
    },
    ConflictError: {
      success: false,
      error: {
        status: 409,
        message: 'A speaker with the email marta.contreras@example.com already exists'
      }
    }
  }
};

const outputFile = './swagger/swagger.json';
const endpointsFiles = ['./routes/index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log('Swagger documentation generated at swagger/swagger.json');
});
