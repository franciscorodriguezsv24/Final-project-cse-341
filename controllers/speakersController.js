const { ObjectId } = require('mongodb');

const { getDb } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildSpeakerDocument } = require('../models/speaker');

const collection = () => getDb().collection('speakers');

const getAll = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.organization) {
    filter.organization = req.query.organization;
  }

  const speakers = await collection().find(filter).sort({ lastName: 1, firstName: 1 }).toArray();

  res.status(200).json({ success: true, count: speakers.length, data: speakers });
});

const getById = asyncHandler(async (req, res) => {
  const speaker = await collection().findOne({ _id: new ObjectId(req.params.speakerId) });

  if (!speaker) {
    throw ApiError.notFound(`No speaker found with id ${req.params.speakerId}`);
  }

  res.status(200).json({ success: true, data: speaker });
});

/**
 * Sessions this speaker is assigned to. The `sessions` collection arrives in
 * Week 06, so until then this correctly returns an empty list.
 */
const getSessions = asyncHandler(async (req, res) => {
  const speakerId = new ObjectId(req.params.speakerId);

  const speaker = await collection().findOne({ _id: speakerId });
  if (!speaker) {
    throw ApiError.notFound(`No speaker found with id ${req.params.speakerId}`);
  }

  const sessions = await getDb()
    .collection('sessions')
    .find({ speakerId })
    .sort({ startTime: 1 })
    .toArray();

  res.status(200).json({ success: true, count: sessions.length, data: sessions });
});

const create = asyncHandler(async (req, res) => {
  const speaker = buildSpeakerDocument(req.body);

  // Checked explicitly for a clear message; the unique index on speakers.email
  // is what actually guarantees it under concurrent requests.
  const duplicate = await collection().findOne({ email: speaker.email });
  if (duplicate) {
    throw ApiError.conflict(`A speaker with the email ${speaker.email} already exists`);
  }

  const result = await collection().insertOne(speaker);

  res.status(201).json({
    success: true,
    message: 'Speaker created',
    data: { _id: result.insertedId, ...speaker }
  });
});

const update = asyncHandler(async (req, res) => {
  const speakerId = new ObjectId(req.params.speakerId);

  const existing = await collection().findOne({ _id: speakerId });
  if (!existing) {
    throw ApiError.notFound(`No speaker found with id ${req.params.speakerId}`);
  }

  const updated = buildSpeakerDocument(req.body);

  // Moving an email onto a record that another speaker already owns.
  const duplicate = await collection().findOne({
    _id: { $ne: speakerId },
    email: updated.email
  });
  if (duplicate) {
    throw ApiError.conflict(`Another speaker already uses the email ${updated.email}`);
  }

  await collection().replaceOne({ _id: speakerId }, updated);

  res.status(200).json({
    success: true,
    message: 'Speaker updated',
    data: { _id: speakerId, ...updated }
  });
});

const remove = asyncHandler(async (req, res) => {
  const speakerId = new ObjectId(req.params.speakerId);

  // Existence is checked first so a missing id reports 404 rather than a
  // confusing 409 about references it cannot have.
  const existing = await collection().findOne({ _id: speakerId });
  if (!existing) {
    throw ApiError.notFound(`No speaker found with id ${req.params.speakerId}`);
  }

  // Refuse to leave sessions pointing at a speaker that is gone.
  const sessionCount = await getDb().collection('sessions').countDocuments({ speakerId });

  if (sessionCount > 0) {
    throw ApiError.conflict(
      `Cannot delete: this speaker is assigned to ${sessionCount} session(s). Reassign those first.`
    );
  }

  await collection().deleteOne({ _id: speakerId });

  res.status(200).json({ success: true, message: 'Speaker deleted' });
});

module.exports = { getAll, getById, getSessions, create, update, remove };
