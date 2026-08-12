const { ObjectId } = require('mongodb');

const { getDb } = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const {
  SEAT_HOLDING_STATUSES,
  buildRegistrationDocument
} = require('../models/registration');

const collection = () => getDb().collection('registrations');

/** A registration is meaningless without the event it belongs to. */
const findEventOrFail = async (eventId) => {
  const event = await getDb().collection('events').findOne({ _id: eventId });

  if (!event) {
    throw ApiError.badRequest('Validation failed', [
      { field: 'eventId', message: 'no event exists with this id', value: eventId.toString() }
    ]);
  }

  return event;
};

/**
 * One person registers once per event. `excludeId` lets PUT ignore the record
 * being replaced, which would otherwise always collide with itself.
 */
const assertEmailIsFree = async (registration, excludeId) => {
  const duplicate = await collection().findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    eventId: registration.eventId,
    attendeeEmail: registration.attendeeEmail
  });

  if (duplicate) {
    throw ApiError.conflict(
      `${registration.attendeeEmail} is already registered for this event`
    );
  }
};

/**
 * Refuses to sell more tickets than the event holds. Cancelled registrations
 * release their seats, so only the seat-holding statuses are counted, and PUT
 * excludes the record it is replacing so its own seats are not counted twice.
 */
const assertSeatsAvailable = async (registration, event, excludeId) => {
  // A cancelled registration takes no seats, so it can always be saved.
  if (!SEAT_HOLDING_STATUSES.includes(registration.status)) {
    return;
  }

  const [totals] = await collection()
    .aggregate([
      {
        $match: {
          ...(excludeId ? { _id: { $ne: excludeId } } : {}),
          eventId: registration.eventId,
          status: { $in: SEAT_HOLDING_STATUSES }
        }
      },
      { $group: { _id: null, seatsTaken: { $sum: '$quantity' } } }
    ])
    .toArray();

  const seatsTaken = totals ? totals.seatsTaken : 0;
  const seatsLeft = event.capacity - seatsTaken;

  if (registration.quantity > seatsLeft) {
    throw ApiError.conflict(
      `Only ${seatsLeft} of ${event.capacity} seat(s) remain for this event, but ${registration.quantity} were requested`
    );
  }
};

const getAll = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.eventId) {
    filter.eventId = new ObjectId(req.query.eventId);
  }
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.attendeeEmail) {
    filter.attendeeEmail = req.query.attendeeEmail;
  }

  const registrations = await collection().find(filter).sort({ registeredAt: -1 }).toArray();

  res.status(200).json({ success: true, count: registrations.length, data: registrations });
});

const getById = asyncHandler(async (req, res) => {
  const registration = await collection().findOne({
    _id: new ObjectId(req.params.registrationId)
  });

  if (!registration) {
    throw ApiError.notFound(`No registration found with id ${req.params.registrationId}`);
  }

  res.status(200).json({ success: true, data: registration });
});

const create = asyncHandler(async (req, res) => {
  const registration = buildRegistrationDocument(req.body);

  const event = await findEventOrFail(registration.eventId);
  await assertEmailIsFree(registration);
  await assertSeatsAvailable(registration, event);

  const result = await collection().insertOne(registration);

  res.status(201).json({
    success: true,
    message: 'Registration created',
    data: { _id: result.insertedId, ...registration }
  });
});

const update = asyncHandler(async (req, res) => {
  const registrationId = new ObjectId(req.params.registrationId);

  const existing = await collection().findOne({ _id: registrationId });
  if (!existing) {
    throw ApiError.notFound(`No registration found with id ${req.params.registrationId}`);
  }

  // PUT replaces the document, but the original purchase time is not the
  // client's to rewrite.
  const updated = buildRegistrationDocument(req.body, { registeredAt: existing.registeredAt });

  const event = await findEventOrFail(updated.eventId);
  await assertEmailIsFree(updated, registrationId);
  await assertSeatsAvailable(updated, event, registrationId);

  await collection().replaceOne({ _id: registrationId }, updated);

  res.status(200).json({
    success: true,
    message: 'Registration updated',
    data: { _id: registrationId, ...updated }
  });
});

const remove = asyncHandler(async (req, res) => {
  const registrationId = new ObjectId(req.params.registrationId);

  const existing = await collection().findOne({ _id: registrationId });
  if (!existing) {
    throw ApiError.notFound(`No registration found with id ${req.params.registrationId}`);
  }

  await collection().deleteOne({ _id: registrationId });

  res.status(200).json({ success: true, message: 'Registration deleted' });
});

module.exports = { getAll, getById, create, update, remove };
