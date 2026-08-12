const { ObjectId } = require('mongodb');

/**
 * Document shape for the `registrations` collection (9 fields including _id).
 * A registration is one attendee holding one or more tickets to an event.
 *
 *   _id, eventId, attendeeName, attendeeEmail, ticketType, quantity,
 *   amountPaid, status, registeredAt
 */

const TICKET_TYPES = ['general', 'student', 'vip', 'speaker'];

const REGISTRATION_STATUSES = ['pending', 'confirmed', 'cancelled'];

/**
 * Statuses that consume seats. A cancelled registration releases its tickets
 * back to the event, so it is excluded from every capacity calculation.
 */
const SEAT_HOLDING_STATUSES = ['pending', 'confirmed'];

/**
 * Builds the stored document from an already-validated request body. Keeping
 * this in one place means POST and PUT can never drift into storing different
 * shapes for the same collection.
 */
const buildRegistrationDocument = (body, { registeredAt = new Date() } = {}) => ({
  eventId: new ObjectId(body.eventId),
  attendeeName: body.attendeeName,
  attendeeEmail: body.attendeeEmail,
  ticketType: body.ticketType,
  quantity: body.quantity,
  amountPaid: body.amountPaid,
  status: body.status,
  registeredAt
});

module.exports = {
  TICKET_TYPES,
  REGISTRATION_STATUSES,
  SEAT_HOLDING_STATUSES,
  buildRegistrationDocument
};
