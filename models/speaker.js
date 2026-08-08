/**
 * Document shape for the `speakers` collection (8 fields including _id),
 * matching the data model in the project proposal.
 *
 *   _id, firstName, lastName, email, organization, jobTitle, bio, photoUrl
 */

const buildSpeakerDocument = (body) => ({
  firstName: body.firstName,
  lastName: body.lastName,
  email: body.email,
  organization: body.organization,
  jobTitle: body.jobTitle,
  bio: body.bio,
  photoUrl: body.photoUrl
});

module.exports = { buildSpeakerDocument };
