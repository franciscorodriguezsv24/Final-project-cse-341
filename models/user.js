/**
 * Document shape for the `users` collection. A user is created the first time
 * someone signs in with GitHub; the API never stores a password because it
 * never sees one.
 *
 *   _id, githubId, username, displayName, email, avatarUrl, createdAt, lastLoginAt
 */

/**
 * Normalizes a GitHub profile into our own document. GitHub returns different
 * shapes depending on the account's privacy settings, so every optional field
 * falls back to null rather than being left undefined.
 */
const buildUserDocument = (profile) => ({
  githubId: String(profile.id),
  username: profile.username || null,
  displayName: profile.displayName || profile.username || 'GitHub user',
  email: (profile.emails && profile.emails[0] && profile.emails[0].value) || null,
  avatarUrl: (profile.photos && profile.photos[0] && profile.photos[0].value) || null
});

/** The subset of a user that is safe to return in an API response. */
const toPublicUser = (user) => ({
  _id: user._id,
  githubId: user.githubId,
  username: user.username,
  displayName: user.displayName,
  email: user.email,
  avatarUrl: user.avatarUrl
});

module.exports = { buildUserDocument, toPublicUser };
