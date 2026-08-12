const express = require('express');

const controller = require('../controllers/eventsController');
const { requireAuth } = require('../middleware/auth');
const {
  handleValidation,
  idParam,
  eventRules,
  eventQueryRules,
  eventCategoryQueryRule
} = require('../middleware/validate');

const router = express.Router();

router.get('/', eventQueryRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Events']
    #swagger.summary = 'Get all events'
    #swagger.description = 'Returns every event sorted by start date. Optionally filtered by status or category.'
    #swagger.parameters['status'] = {
      in: 'query',
      description: 'Filter by status',
      required: false,
      type: 'string',
      enum: ['draft', 'published', 'cancelled']
    }
    #swagger.parameters['category'] = {
      in: 'query',
      description: 'Filter by category',
      required: false,
      type: 'string',
      enum: ['technology', 'business', 'health', 'education', 'science', 'arts', 'community', 'other']
    }
    #swagger.responses[200] = { description: 'List of events' }
    #swagger.responses[400] = { description: 'Validation failed - unknown status or category' }
    #swagger.responses[500] = { description: 'Internal server error' }
  */
  controller.getAll(req, res, next);
});

// Declared before '/:eventId' so the literal path is not captured as an id.
router.get('/findByCategory', eventCategoryQueryRule, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Events']
    #swagger.summary = 'Find events by category'
    #swagger.description = 'Returns every event in the requested category, sorted by start date.'
    #swagger.parameters['category'] = {
      in: 'query',
      description: 'Category to search for',
      required: true,
      type: 'string',
      enum: ['technology', 'business', 'health', 'education', 'science', 'arts', 'community', 'other']
    }
    #swagger.responses[200] = { description: 'Matching events' }
    #swagger.responses[400] = { description: 'Validation failed - category missing or unknown' }
  */
  controller.getByCategory(req, res, next);
});

router.get('/:eventId', idParam('eventId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Events']
    #swagger.summary = 'Get a single event by id'
    #swagger.parameters['eventId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'The requested event' }
    #swagger.responses[400] = { description: 'Validation failed - eventId is not a valid ObjectId' }
    #swagger.responses[404] = { description: 'Event not found' }
  */
  controller.getById(req, res, next);
});

router.get('/:eventId/sessions', idParam('eventId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Events']
    #swagger.summary = 'Get every session belonging to an event'
    #swagger.description = 'The sessions collection is implemented in Week 06; until then this returns an empty list for an existing event.'
    #swagger.parameters['eventId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'Sessions for this event' }
    #swagger.responses[400] = { description: 'Validation failed - eventId is not a valid ObjectId' }
    #swagger.responses[404] = { description: 'Event not found' }
  */
  controller.getSessions(req, res, next);
});

router.post('/', requireAuth, eventRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Events']
    #swagger.summary = 'Create a new event (protected)'
    #swagger.description = 'Requires a GitHub sign-in at /auth/github. organizerId is optional: when it is omitted the signed-in user becomes the organizer.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Event to create',
      required: true,
      schema: { $ref: '#/definitions/EventInput' }
    }
    #swagger.responses[201] = { description: 'Event created' }
    #swagger.responses[400] = { description: 'Validation failed' }
    #swagger.responses[401] = { description: 'Not signed in' }
  */
  controller.create(req, res, next);
});

router.put('/:eventId', requireAuth, idParam('eventId'), eventRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Events']
    #swagger.summary = 'Replace an existing event (protected)'
    #swagger.description = 'Requires a GitHub sign-in at /auth/github. PUT replaces the whole document, so every field is required. createdAt and the original organizer are preserved.'
    #swagger.parameters['eventId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Full replacement event',
      required: true,
      schema: { $ref: '#/definitions/EventInput' }
    }
    #swagger.responses[200] = { description: 'Event updated' }
    #swagger.responses[400] = { description: 'Validation failed' }
    #swagger.responses[401] = { description: 'Not signed in' }
    #swagger.responses[404] = { description: 'Event not found' }
  */
  controller.update(req, res, next);
});

router.delete('/:eventId', requireAuth, idParam('eventId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Events']
    #swagger.summary = 'Delete an event (protected)'
    #swagger.description = 'Requires a GitHub sign-in at /auth/github. Fails with 409 when sessions or registrations still reference this event.'
    #swagger.parameters['eventId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'Event deleted' }
    #swagger.responses[400] = { description: 'Validation failed - eventId is not a valid ObjectId' }
    #swagger.responses[401] = { description: 'Not signed in' }
    #swagger.responses[404] = { description: 'Event not found' }
    #swagger.responses[409] = { description: 'Event still has sessions or registrations' }
  */
  controller.remove(req, res, next);
});

module.exports = router;
