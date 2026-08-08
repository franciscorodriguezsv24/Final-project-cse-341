const { ObjectId } = require('mongodb');

const { getDb } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildEventDocument } = require('../models/event');

const collection = () => getDb().collection('events');

const getAll = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.category) {
    filter.category = req.query.category;
  }

  const events = await collection().find(filter).sort({ startDate: 1 }).toArray();

  res.status(200).json({ success: true, count: events.length, data: events });
});

const getByCategory = asyncHandler(async (req, res) => {
  const events = await collection()
    .find({ category: req.query.category })
    .sort({ startDate: 1 })
    .toArray();

  res.status(200).json({ success: true, count: events.length, data: events });
});

const getById = asyncHandler(async (req, res) => {
  const event = await collection().findOne({ _id: new ObjectId(req.params.eventId) });

  if (!event) {
    throw ApiError.notFound(`No event found with id ${req.params.eventId}`);
  }

  res.status(200).json({ success: true, data: event });
});

/**
 * Sessions belonging to one event. The `sessions` collection arrives in Week 06,
 * so until then this correctly returns an empty list for an existing event.
 */
const getSessions = asyncHandler(async (req, res) => {
  const eventId = new ObjectId(req.params.eventId);

  const event = await collection().findOne({ _id: eventId });
  if (!event) {
    throw ApiError.notFound(`No event found with id ${req.params.eventId}`);
  }

  const sessions = await getDb()
    .collection('sessions')
    .find({ eventId })
    .sort({ startTime: 1 })
    .toArray();

  res.status(200).json({ success: true, count: sessions.length, data: sessions });
});

const create = asyncHandler(async (req, res) => {
  const event = buildEventDocument(req.body);

  const result = await collection().insertOne(event);

  res.status(201).json({
    success: true,
    message: 'Event created',
    data: { _id: result.insertedId, ...event }
  });
});

const update = asyncHandler(async (req, res) => {
  const eventId = new ObjectId(req.params.eventId);

  const existing = await collection().findOne({ _id: eventId });
  if (!existing) {
    throw ApiError.notFound(`No event found with id ${req.params.eventId}`);
  }

  // PUT replaces the document, but createdAt belongs to the original record.
  const updated = buildEventDocument(req.body, { createdAt: existing.createdAt });

  await collection().replaceOne({ _id: eventId }, updated);

  res.status(200).json({
    success: true,
    message: 'Event updated',
    data: { _id: eventId, ...updated }
  });
});

const remove = asyncHandler(async (req, res) => {
  const eventId = new ObjectId(req.params.eventId);

  // Existence is checked first so a missing id reports 404 rather than a
  // confusing 409 about references it cannot have.
  const existing = await collection().findOne({ _id: eventId });
  if (!existing) {
    throw ApiError.notFound(`No event found with id ${req.params.eventId}`);
  }

  // Refuse to leave sessions or registrations pointing at an event that is gone.
  const [sessionCount, registrationCount] = await Promise.all([
    getDb().collection('sessions').countDocuments({ eventId }),
    getDb().collection('registrations').countDocuments({ eventId })
  ]);

  if (sessionCount > 0 || registrationCount > 0) {
    throw ApiError.conflict(
      `Cannot delete: this event still has ${sessionCount} session(s) and ${registrationCount} registration(s). Remove those first.`
    );
  }

  await collection().deleteOne({ _id: eventId });

  res.status(200).json({ success: true, message: 'Event deleted' });
});

module.exports = { getAll, getByCategory, getById, getSessions, create, update, remove };
