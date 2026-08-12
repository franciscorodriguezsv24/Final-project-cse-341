const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  /*
    #swagger.tags = ['Root']
    #swagger.summary = 'API information'
    #swagger.description = 'Confirms the API is running and points to the documentation and the login route.'
    #swagger.responses[200] = { description: 'API metadata' }
  */
  const authenticated = typeof req.isAuthenticated === 'function' && req.isAuthenticated();

  res.status(200).json({
    success: true,
    name: 'ConferenceHub API',
    version: '2.0.0',
    documentation: '/api-docs',
    collections: ['events', 'speakers', 'sessions', 'registrations'],
    auth: {
      login: '/auth/github',
      status: '/auth/status',
      logout: '/auth/logout',
      authenticated
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

router.use('/auth', require('./auth'));
router.use('/events', require('./events'));
router.use('/speakers', require('./speakers'));
router.use('/sessions', require('./sessions'));
router.use('/registrations', require('./registrations'));

module.exports = router;
