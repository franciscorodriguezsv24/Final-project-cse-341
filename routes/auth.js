const express = require('express');

const { passport, isOAuthConfigured } = require('../config/passport');
const { toPublicUser } = require('../models/user');
const ApiError = require('../utils/ApiError');

const router = express.Router();

/**
 * Without credentials the GitHub strategy was never registered, so calling
 * passport.authenticate would throw an unhelpful "Unknown strategy" error.
 * This turns that into an honest 503.
 */
const ensureOAuthConfigured = (req, res, next) => {
  if (!isOAuthConfigured()) {
    return next(
      new ApiError(503, 'GitHub OAuth is not configured on this server. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.')
    );
  }
  return next();
};

router.get('/github', ensureOAuthConfigured, (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Start GitHub OAuth login'
    #swagger.description = '### ➡️ [Click here to sign in](/auth/github) <br><br> Do NOT press Execute below. This route answers with a 302 redirect to github.com, and the browser blocks the JavaScript on this page from following a redirect to another site, so Try it out reports "Failed to fetch" even though the route worked. Authorization has to be a real browser navigation so you can see github.com in the address bar before entering credentials. Use the link above, approve the app, and GitHub returns you to /auth/github/callback, which creates the session and sends you back to /api-docs.'
    #swagger.responses[302] = { description: 'Redirect to GitHub for authorization' }
    #swagger.responses[503] = { description: 'OAuth is not configured on this server' }
  */
  passport.authenticate('github', { scope: ['user:email'] })(req, res, next);
});

router.get(
  '/github/callback',
  ensureOAuthConfigured,
  (req, res, next) => {
    /*
      #swagger.tags = ['Auth']
      #swagger.summary = 'GitHub OAuth callback'
      #swagger.description = 'GitHub redirects here after the user approves. Creates the session and forwards to the documentation.'
      #swagger.responses[302] = { description: 'Redirect to /api-docs once signed in' }
    */
    passport.authenticate('github', { failureRedirect: '/auth/failure' })(req, res, next);
  },
  (req, res) => {
    res.redirect('/api-docs');
  }
);

router.get('/failure', (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'OAuth failure landing route'
    #swagger.responses[401] = { description: 'GitHub sign-in was denied or failed' }
  */
  next(ApiError.unauthorized('GitHub sign-in failed or was denied.'));
});

router.get('/status', (req, res) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Who am I'
    #swagger.description = 'Reports whether the current session is signed in, and who as. Use it to confirm login and logout worked.'
    #swagger.responses[200] = { description: 'Current authentication state' }
  */
  const authenticated = typeof req.isAuthenticated === 'function' && req.isAuthenticated();

  res.status(200).json({
    success: true,
    authenticated,
    user: authenticated ? toPublicUser(req.user) : null
  });
});

router.get('/logout', (req, res, next) => {
  /*
    #swagger.tags = ['Auth']
    #swagger.summary = 'Log out'
    #swagger.description = 'Clears the Passport login, destroys the session record, and clears the cookie. Afterwards every protected route returns 401 again.'
    #swagger.responses[200] = { description: 'Signed out' }
  */
  // req.logout is async in Passport 0.6+, and the session is destroyed inside
  // its callback so the store row is removed, not just the login state.
  req.logout((logoutError) => {
    if (logoutError) {
      return next(logoutError);
    }

    return req.session.destroy((destroyError) => {
      if (destroyError) {
        return next(destroyError);
      }

      res.clearCookie('conferencehub.sid');
      return res.status(200).json({ success: true, message: 'Signed out' });
    });
  });
});

module.exports = router;
