require('dotenv').config();

const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'ConferenceHub API',
    version: '1.0.0',
    description:
      'REST API for organizing multi-day conferences and the events inside them. ' +
      'This release covers the first two collections, events and speakers, with full CRUD, ' +
      'request validation and centralized error handling. Sessions, attendees, registrations ' +
      'and GitHub OAuth follow in the next iteration.'
  },
  host: process.env.SWAGGER_HOST || 'localhost:8080',
  basePath: '/',
  schemes: [process.env.SWAGGER_SCHEME || 'http'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    { name: 'Root', description: 'Service information and health' },
    { name: 'Events', description: 'Conference events (12-field collection)' },
    { name: 'Speakers', description: 'People who present at sessions (8-field collection)' }
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
      $organizerId: '66b0f2c8a1d4e5f60912ab34'
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
