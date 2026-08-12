const express = require('express');

const controller = require('../controllers/registrationsController');
const { requireAuth } = require('../middleware/auth');
const {
  handleValidation,
  idParam,
  registrationRules,
  registrationQueryRules
} = require('../middleware/validate');

const router = express.Router();

router.get('/', registrationQueryRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Registrations']
    #swagger.summary = 'Get all registrations'
    #swagger.description = 'Returns every registration, newest first. Optionally filtered by event, status or attendee email.'
    #swagger.parameters['eventId'] = {
      in: 'query',
      description: 'Only registrations for this event',
      required: false,
      type: 'string'
    }
    #swagger.parameters['status'] = {
      in: 'query',
      description: 'Filter by status',
      required: false,
      type: 'string',
      enum: ['pending', 'confirmed', 'cancelled']
    }
    #swagger.parameters['attendeeEmail'] = {
      in: 'query',
      description: 'Only registrations held by this email address',
      required: false,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'List of registrations' }
    #swagger.responses[400] = { description: 'Validation failed - unknown status or malformed id or email' }
    #swagger.responses[500] = { description: 'Internal server error' }
  */
  controller.getAll(req, res, next);
});

router.get('/:registrationId', idParam('registrationId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Registrations']
    #swagger.summary = 'Get a single registration by id'
    #swagger.parameters['registrationId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'The requested registration' }
    #swagger.responses[400] = { description: 'Validation failed - registrationId is not a valid ObjectId' }
    #swagger.responses[404] = { description: 'Registration not found' }
  */
  controller.getById(req, res, next);
});

router.post('/', requireAuth, registrationRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Registrations']
    #swagger.summary = 'Create a new registration (protected)'
    #swagger.description = 'Requires a GitHub sign-in at /auth/github. The event must exist, the attendee must not already be registered for it, and enough seats must remain.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Registration to create',
      required: true,
      schema: { $ref: '#/definitions/RegistrationInput' }
    }
    #swagger.responses[201] = { description: 'Registration created' }
    #swagger.responses[400] = { description: 'Validation failed, or eventId does not exist' }
    #swagger.responses[401] = { description: 'Not signed in' }
    #swagger.responses[409] = { description: 'Duplicate attendee email for the event, or the event is sold out' }
  */
  controller.create(req, res, next);
});

router.put(
  '/:registrationId',
  requireAuth,
  idParam('registrationId'),
  registrationRules,
  handleValidation,
  (req, res, next) => {
    /*
      #swagger.tags = ['Registrations']
      #swagger.summary = 'Replace an existing registration (protected)'
      #swagger.description = 'Requires a GitHub sign-in at /auth/github. PUT replaces the whole document, so every field is required. registeredAt is preserved from the original record.'
      #swagger.parameters['registrationId'] = {
        in: 'path',
        description: '24-character MongoDB ObjectId',
        required: true,
        type: 'string'
      }
      #swagger.parameters['body'] = {
        in: 'body',
        description: 'Full replacement registration',
        required: true,
        schema: { $ref: '#/definitions/RegistrationInput' }
      }
      #swagger.responses[200] = { description: 'Registration updated' }
      #swagger.responses[400] = { description: 'Validation failed, or eventId does not exist' }
      #swagger.responses[401] = { description: 'Not signed in' }
      #swagger.responses[404] = { description: 'Registration not found' }
      #swagger.responses[409] = { description: 'Duplicate attendee email for the event, or not enough seats remain' }
    */
    controller.update(req, res, next);
  }
);

router.delete(
  '/:registrationId',
  requireAuth,
  idParam('registrationId'),
  handleValidation,
  (req, res, next) => {
    /*
      #swagger.tags = ['Registrations']
      #swagger.summary = 'Delete a registration (protected)'
      #swagger.description = 'Requires a GitHub sign-in at /auth/github. Deleting releases the seats back to the event.'
      #swagger.parameters['registrationId'] = {
        in: 'path',
        description: '24-character MongoDB ObjectId',
        required: true,
        type: 'string'
      }
      #swagger.responses[200] = { description: 'Registration deleted' }
      #swagger.responses[400] = { description: 'Validation failed - registrationId is not a valid ObjectId' }
      #swagger.responses[401] = { description: 'Not signed in' }
      #swagger.responses[404] = { description: 'Registration not found' }
    */
    controller.remove(req, res, next);
  }
);

module.exports = router;
