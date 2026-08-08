const { ObjectId } = require('mongodb');

/**
 * Document shape for the `events` collection (12 fields including _id), matching
 * the data model in the project proposal.
 *
 *   _id, title, description, startDate, endDate, location, capacity,
 *   category, ticketPrice, status, organizerId, createdAt
 */

const CATEGORIES = [
  'technology',
  'business',
  'health',
  'education',
  'science',
  'arts',
  'community',
  'other'
];

const STATUSES = ['draft', 'published', 'cancelled'];

/**
 * Builds the stored document from an already-validated request body. Keeping
 * this in one place means POST and PUT can never drift into storing different
 * shapes for the same collection.
 */
const buildEventDocument = (body, { createdAt = new Date() } = {}) => ({
  title: body.title,
  description: body.description,
  startDate: new Date(body.startDate),
  endDate: new Date(body.endDate),
  location: body.location,
  capacity: body.capacity,
  category: body.category,
  ticketPrice: body.ticketPrice,
  status: body.status,
  organizerId: new ObjectId(body.organizerId),
  createdAt
});

module.exports = { CATEGORIES, STATUSES, buildEventDocument };
