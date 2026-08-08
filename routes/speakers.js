const express = require('express');

const controller = require('../controllers/speakersController');
const { handleValidation, idParam, speakerRules } = require('../middleware/validate');

const router = express.Router();

router.get('/', (req, res, next) => {
  /*
    #swagger.tags = ['Speakers']
    #swagger.summary = 'Get all speakers'
    #swagger.description = 'Returns every speaker sorted by last name. Optionally filtered by organization.'
    #swagger.parameters['organization'] = {
      in: 'query',
      description: 'Filter by exact organization name',
      required: false,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'List of speakers' }
    #swagger.responses[500] = { description: 'Internal server error' }
  */
  controller.getAll(req, res, next);
});

router.get('/:speakerId', idParam('speakerId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Speakers']
    #swagger.summary = 'Get a single speaker by id'
    #swagger.parameters['speakerId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'The requested speaker' }
    #swagger.responses[400] = { description: 'Validation failed - speakerId is not a valid ObjectId' }
    #swagger.responses[404] = { description: 'Speaker not found' }
  */
  controller.getById(req, res, next);
});

router.get('/:speakerId/sessions', idParam('speakerId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Speakers']
    #swagger.summary = 'Get every session assigned to a speaker'
    #swagger.description = 'The sessions collection is implemented in Week 06; until then this returns an empty list for an existing speaker.'
    #swagger.parameters['speakerId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'Sessions for this speaker' }
    #swagger.responses[400] = { description: 'Validation failed - speakerId is not a valid ObjectId' }
    #swagger.responses[404] = { description: 'Speaker not found' }
  */
  controller.getSessions(req, res, next);
});

router.post('/', speakerRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Speakers']
    #swagger.summary = 'Create a new speaker'
    #swagger.description = 'Becomes organizer-only once OAuth is added in Week 06.'
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Speaker to create',
      required: true,
      schema: { $ref: '#/definitions/SpeakerInput' }
    }
    #swagger.responses[201] = { description: 'Speaker created' }
    #swagger.responses[400] = { description: 'Validation failed' }
    #swagger.responses[409] = { description: 'A speaker with that email already exists' }
  */
  controller.create(req, res, next);
});

router.put('/:speakerId', idParam('speakerId'), speakerRules, handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Speakers']
    #swagger.summary = 'Replace an existing speaker'
    #swagger.description = 'PUT replaces the whole document, so every field is required.'
    #swagger.parameters['speakerId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Full replacement speaker',
      required: true,
      schema: { $ref: '#/definitions/SpeakerInput' }
    }
    #swagger.responses[200] = { description: 'Speaker updated' }
    #swagger.responses[400] = { description: 'Validation failed' }
    #swagger.responses[404] = { description: 'Speaker not found' }
    #swagger.responses[409] = { description: 'Another speaker already uses that email' }
  */
  controller.update(req, res, next);
});

router.delete('/:speakerId', idParam('speakerId'), handleValidation, (req, res, next) => {
  /*
    #swagger.tags = ['Speakers']
    #swagger.summary = 'Delete a speaker'
    #swagger.description = 'Fails with 409 when sessions are still assigned to this speaker.'
    #swagger.parameters['speakerId'] = {
      in: 'path',
      description: '24-character MongoDB ObjectId',
      required: true,
      type: 'string'
    }
    #swagger.responses[200] = { description: 'Speaker deleted' }
    #swagger.responses[400] = { description: 'Validation failed - speakerId is not a valid ObjectId' }
    #swagger.responses[404] = { description: 'Speaker not found' }
    #swagger.responses[409] = { description: 'Speaker is still assigned to sessions' }
  */
  controller.remove(req, res, next);
});

module.exports = router;
