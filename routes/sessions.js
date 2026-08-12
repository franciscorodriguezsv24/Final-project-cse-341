const express = require('express');

const controller = require('../controllers/sessionsController');
const { requireAuth } = require('../middleware/auth');
const {
  handleValidation,
  idParam,
  sessionRules,
  sessionQueryRules
} = require('../middleware/validate');

const router = express.Router();

router.get('/', sessionQueryRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Sessions']
    #swagger.summary = 'Get all sessions'
    #swagger.description = 'Returns every session sorted by start time. Optionally filtered by event, speaker or track.'
    #swagger.parameters['eventId'] = {
      in: 'query',
      description: 'Only sessions belonging to this event',
      required: false,
      type: 'string'
    }
    #swagger.parameters['speakerId'] = {
      in: 'query',
      description: 'Only sessions given by this speaker',
      required: false,
      type: 'string'
    }
    #swagger.parameters['track'] = {
      in: 'query',
      description: 'Filter by track',
      required: false,
      type: 'string',
      enum: ['general', 'frontend', 'backend', 'cloud', 'data', 'career', 'workshop']
    }
    #swagger.responses[200] = { description: 'List of sessions' }
    #swagger.responses[400] = { description: 'Validation failed - unknown track or malformed id' }
    #swagger.responses[500] = { description: 'Internal server error' }
  */
  controller.getAll(req, res, next);
});

router.get('/:sessionId', idParam('sessionId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Sessions']
    #swagger.summary = 'Get a single session by id'
    #swagger.parameters['sessionId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'The requested session' }
    #swagger.responses[400] = { description: 'Validation failed - sessionId is not a valid ObjectId' }
    #swagger.responses[404] = { description: 'Session not found' }
  */
  controller.getById(req, res, next);
});

router.post('/', requireAuth, sessionRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Sessions']
    #swagger.summary = 'Create a new session (protected)'
    #swagger.description = 'Requires a GitHub sign-in at /auth/github. The referenced event and speaker must exist, and the room must be free for the whole time slot.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Session to create',
      required: true,
      schema: { $ref: '#/definitions/SessionInput' }
    }
    #swagger.responses[201] = { description: 'Session created' }
    #swagger.responses[400] = { description: 'Validation failed, or eventId/speakerId does not exist' }
    #swagger.responses[401] = { description: 'Not signed in' }
    #swagger.responses[409] = { description: 'The room is already booked for that time slot' }
  */
  controller.create(req, res, next);
});

router.put(
  '/:sessionId',
  requireAuth,
  idParam('sessionId'),
  sessionRules,
  handleValidation,
  (req, res, next) => {
    /*
      #swagger.tags = ['Sessions']
      #swagger.summary = 'Replace an existing session (protected)'
      #swagger.description = 'Requires a GitHub sign-in at /auth/github. PUT replaces the whole document, so every field is required. createdAt is preserved from the original record.'
      #swagger.parameters['sessionId'] = {
        in: 'path',
        description: '24-character MongoDB ObjectId',
        required: true,
        type: 'string'
      }
      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Full replacement session',
        required: true,
        schema: { $ref: '#/definitions/SessionInput' }
      }
      #swagger.responses[200] = { description: 'Session updated' }
      #swagger.responses[400] = { description: 'Validation failed, or eventId/speakerId does not exist' }
      #swagger.responses[401] = { description: 'Not signed in' }
      #swagger.responses[404] = { description: 'Session not found' }
      #swagger.responses[409] = { description: 'The room is already booked for that time slot' }
    */
    controller.update(req, res, next);
  }
);

router.delete('/:sessionId', requireAuth, idParam('sessionId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Sessions']
    #swagger.summary = 'Delete a session (protected)'
    #swagger.description = 'Requires a GitHub sign-in at /auth/github.'
    #swagger.parameters['sessionId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'Session deleted' }
    #swagger.responses[400] = { description: 'Validation failed - sessionId is not a valid ObjectId' }
    #swagger.responses[401] = { description: 'Not signed in' }
    #swagger.responses[404] = { description: 'Session not found' }
  */
  controller.remove(req, res, next);
});

module.exports = router;
