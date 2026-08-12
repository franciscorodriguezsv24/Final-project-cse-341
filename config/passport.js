const passport = require('passport');
const { ObjectId } = require('mongodb');
const GitHubStrategy = require('passport-github2').Strategy;

const { getDb } = require('./db');
const { buildUserDocument } = require('../models/user');

const users = () => getDb().collection('users');

/**
 * OAuth is only wired up when the GitHub credentials are present. This keeps
 * `npm test` and a fresh clone runnable without secrets, and turns a missing
 * key into one clear 503 at /auth/github instead of a crash at startup.
 */
const isOAuthConfigured = () =>
  Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

/**
 * Only the user's id goes into the session cookie. Everything else is read
 * back from the database on each request, so a changed profile is never served
 * from a stale cookie.
 */
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await users().findOne({ _id: new ObjectId(id) });
    // A deleted user leaves a valid cookie behind; `false` logs it out cleanly.
    done(null, user || false);
  } catch (error) {
    done(error);
  }
});

/**
 * Finds the account behind a GitHub profile, creating it on first sign-in.
 * Matching is on the immutable numeric GitHub id rather than the username,
 * because a user can rename their GitHub account at any time.
 */
const findOrCreateUser = async (profile) => {
  const details = buildUserDocument(profile);
  const now = new Date();

  const result = await users().findOneAndUpdate(
    { githubId: details.githubId },
    {
      $set: { ...details, lastLoginAt: now },
      $setOnInsert: { createdAt: now }
    },
    { upsert: true, returnDocument: 'after' }
  );

  return result.value || result;
};

const configurePassport = () => {
  if (!isOAuthConfigured()) {
    // Expected under test, where the suite never exercises the real handshake;
    // warning there would only bury the test names in noise.
    if (process.env.NODE_ENV !== 'test') {
      console.warn('GitHub OAuth is not configured - /auth/github will return 503.');
    }
    return;
  }

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:
          process.env.GITHUB_CALLBACK_URL || 'http://localhost:8080/auth/github/callback',
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // The access token is deliberately not stored: this API only needs
          // GitHub to prove identity, never to act on the user's behalf.
          const user = await findOrCreateUser(profile);
          done(null, user);
        } catch (error) {
          done(error);
        }
      }
    )
  );
};

module.exports = { passport, configurePassport, isOAuthConfigured, findOrCreateUser };
