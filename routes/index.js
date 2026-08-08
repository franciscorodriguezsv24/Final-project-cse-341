const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  /*
    #swagger.tags = ['Root']
    #swagger.summary = 'API information'
    #swagger.description = 'Confirms the API is running and points to the documentation.'
    #swagger.responses[200] = { description: 'API metadata' }
  */
  res.status(200).json({
    success: true,
    name: 'ConferenceHub API',
    version: '1.0.0',
    documentation: '/api-docs',
    collections: {
      implemented: ['events', 'speakers'],
      planned: ['sessions', 'attendees', 'registrations']
    }
  });
});

router.get('/health', (req, res) => {
  /*
    #swagger.tags = ['Root']
    #swagger.summary = 'Health check'
    #swagger.description = 'Used by Render to confirm the service is up.'
    #swagger.responses[200] = { description: 'Service is healthy' }
  */
  res.status(200).json({ success: true, status: 'ok', uptimeSeconds: Math.floor(process.uptime()) });
});

router.use('/events', require('./events'));
router.use('/speakers', require('./speakers'));

module.exports = router;
