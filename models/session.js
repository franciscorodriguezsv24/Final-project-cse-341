const { ObjectId } = require('mongodb');

/**
 * Document shape for the `sessions` collection (11 fields including _id).
 * A session is one talk inside an event, given by one speaker.
 *
 *   _id, eventId, speakerId, title, description, startTime, endTime,
 *   room, track, capacity, createdAt
 */

const TRACKS = [
  'general',
  'frontend',
  'backend',
  'cloud',
  'data',
  'career',
  'workshop'
];

/**
 * Builds the stored document from an already-validated request body. Keeping
 * this in one place means POST and PUT can never drift into storing different
 * shapes for the same collection.
 */
const buildSessionDocument = (body, { createdAt = new Date() } = {}) => ({
  eventId: new ObjectId(body.eventId),
  speakerId: new ObjectId(body.speakerId),
  title: body.title,
  description: body.description,
  startTime: new Date(body.startTime),
  endTime: new Date(body.endTime),
  room: body.room,
  track: body.track,
  capacity: body.capacity,
  createdAt
});

module.exports = { TRACKS, buildSessionDocument };
