const { ObjectId } = require('mongodb');

const { getDb } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildSessionDocument } = require('../models/session');

const collection = () => getDb().collection('sessions');

/**
 * A session points at both an event and a speaker, so a write is only accepted
 * once both exist. Reporting them together means a client with two bad ids
 * learns about both in one round trip, matching how field validation behaves.
 */
const assertReferencesExist = async ({ eventId, speakerId }) => {
  const [event, speaker] = await Promise.all([
    getDb().collection('events').findOne({ _id: eventId }, { projection: { _id: 1 } }),
    getDb().collection('speakers').findOne({ _id: speakerId }, { projection: { _id: 1 } })
  ]);

  const details = [];
  if (!event) {
    details.push({
      field: 'eventId',
      message: 'no event exists with this id',
      value: eventId.toString()
    });
  }
  if (!speaker) {
    details.push({
      field: 'speakerId',
      message: 'no speaker exists with this id',
      value: speakerId.toString()
    });
  }

  if (details.length > 0) {
    throw ApiError.badRequest('Validation failed', details);
  }
};

/**
 * Two talks cannot run in the same room at the same time. `excludeId` lets PUT
 * ignore the record being replaced, which would otherwise always collide with
 * itself.
 */
const assertRoomIsFree = async (session, excludeId) => {
  const clash = await collection().findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    eventId: session.eventId,
    room: session.room,
    // Two ranges overlap when each starts before the other ends.
    startTime: { $lt: session.endTime },
    endTime: { $gt: session.startTime }
  });

  if (clash) {
    throw ApiError.conflict(
      `Room ${session.room} is already booked for "${clash.title}" during that time slot`
    );
  }
};

const getAll = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.eventId) {
    filter.eventId = new ObjectId(req.query.eventId);
  }
  if (req.query.speakerId) {
    filter.speakerId = new ObjectId(req.query.speakerId);
  }
  if (req.query.track) {
    filter.track = req.query.track;
  }

  const sessions = await collection().find(filter).sort({ startTime: 1 }).toArray();

  res.status(200).json({ success: true, count: sessions.length, data: sessions });
});

const getById = asyncHandler(async (req, res) => {
  const session = await collection().findOne({ _id: new ObjectId(req.params.sessionId) });

  if (!session) {
    throw ApiError.notFound(`No session found with id ${req.params.sessionId}`);
  }

  res.status(200).json({ success: true, data: session });
});

const create = asyncHandler(async (req, res) => {
  const session = buildSessionDocument(req.body);

  await assertReferencesExist(session);
  await assertRoomIsFree(session);

  const result = await collection().insertOne(session);

  res.status(201).json({
    success: true,
    message: 'Session created',
    data: { _id: result.insertedId, ...session }
  });
});

const update = asyncHandler(async (req, res) => {
  const sessionId = new ObjectId(req.params.sessionId);

  const existing = await collection().findOne({ _id: sessionId });
  if (!existing) {
    throw ApiError.notFound(`No session found with id ${req.params.sessionId}`);
  }

  // PUT replaces the document, but createdAt belongs to the original record.
  const updated = buildSessionDocument(req.body, { createdAt: existing.createdAt });

  await assertReferencesExist(updated);
  await assertRoomIsFree(updated, sessionId);

  await collection().replaceOne({ _id: sessionId }, updated);

  res.status(200).json({
    success: true,
    message: 'Session updated',
    data: { _id: sessionId, ...updated }
  });
});

const remove = asyncHandler(async (req, res) => {
  const sessionId = new ObjectId(req.params.sessionId);

  const existing = await collection().findOne({ _id: sessionId });
  if (!existing) {
    throw ApiError.notFound(`No session found with id ${req.params.sessionId}`);
  }

  await collection().deleteOne({ _id: sessionId });

  res.status(200).json({ success: true, message: 'Session deleted' });
});

module.exports = { getAll, getById, create, update, remove };
