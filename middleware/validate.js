const { body, param, query, validationResult } = require('express-validator');

const ApiError = require('../utils/ApiError');
const { CATEGORIES, STATUSES } = require('../models/event');
const { TRACKS } = require('../models/session');
const { TICKET_TYPES, REGISTRATION_STATUSES } = require('../models/registration');

/**
 * Collects every express-validator failure into a single 400 response listing
 * each bad field, so a client fixes all problems in one round trip instead of
 * discovering them one at a time.
 */
const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((issue) => ({
    field: issue.path,
    message: issue.msg,
    value: issue.value
  }));

  return next(ApiError.badRequest('Validation failed', details));
};

/** Reused by every /:id route so an invalid ObjectId never reaches the driver. */
const idParam = (name = 'id') => [
  param(name).isMongoId().withMessage(`${name} must be a valid 24-character MongoDB ObjectId`)
];

/* ------------------------------- events ------------------------------- */

const eventRules = [
  body('title')
    .exists({ values: 'falsy' })
    .withMessage('title is required')
    .bail()
    .isString()
    .withMessage('title must be a string')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('title must be between 3 and 150 characters'),

  body('description')
    .exists({ values: 'falsy' })
    .withMessage('description is required')
    .bail()
    .isString()
    .withMessage('description must be a string')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('description must be between 10 and 2000 characters'),

  body('startDate')
    .exists({ values: 'falsy' })
    .withMessage('startDate is required')
    .bail()
    .isISO8601()
    .withMessage('startDate must be an ISO 8601 date, e.g. 2026-09-14T09:00:00Z'),

  body('endDate')
    .exists({ values: 'falsy' })
    .withMessage('endDate is required')
    .bail()
    .isISO8601()
    .withMessage('endDate must be an ISO 8601 date, e.g. 2026-09-16T17:00:00Z')
    .bail()
    // Cross-field check: a conference cannot finish before it starts.
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.startDate)) {
        throw new Error('endDate must be the same as or after startDate');
      }
      return true;
    }),

  body('location')
    .exists({ values: 'falsy' })
    .withMessage('location is required')
    .bail()
    .isString()
    .withMessage('location must be a string')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('location must be between 3 and 200 characters'),

  body('capacity')
    .exists({ values: 'falsy' })
    .withMessage('capacity is required')
    .bail()
    .isInt({ min: 1, max: 100000 })
    .withMessage('capacity must be an integer between 1 and 100000')
    .toInt(),

  body('category')
    .exists({ values: 'falsy' })
    .withMessage('category is required')
    .bail()
    .isIn(CATEGORIES)
    .withMessage(`category must be one of: ${CATEGORIES.join(', ')}`),

  // Note: `exists` is not used here because 0 is a legitimate ticket price.
  body('ticketPrice')
    .exists()
    .withMessage('ticketPrice is required')
    .bail()
    .isFloat({ min: 0, max: 100000 })
    .withMessage('ticketPrice must be a number between 0 and 100000')
    .toFloat(),

  body('status')
    .exists({ values: 'falsy' })
    .withMessage('status is required')
    .bail()
    .isIn(STATUSES)
    .withMessage(`status must be one of: ${STATUSES.join(', ')}`),

  // Optional since OAuth landed: when it is omitted the controller takes the
  // organizer from the authenticated session rather than trusting the client.
  body('organizerId')
    .optional()
    .isMongoId()
    .withMessage('organizerId must be a valid 24-character MongoDB ObjectId')
];

const eventQueryRules = [
  query('status')
    .optional()
    .isIn(STATUSES)
    .withMessage(`status must be one of: ${STATUSES.join(', ')}`),
  query('category')
    .optional()
    .isIn(CATEGORIES)
    .withMessage(`category must be one of: ${CATEGORIES.join(', ')}`)
];

const eventCategoryQueryRule = [
  query('category')
    .exists({ values: 'falsy' })
    .withMessage('category query parameter is required')
    .bail()
    .isIn(CATEGORIES)
    .withMessage(`category must be one of: ${CATEGORIES.join(', ')}`)
];

/* ------------------------------ speakers ------------------------------ */

const speakerRules = [
  body('firstName')
    .exists({ values: 'falsy' })
    .withMessage('firstName is required')
    .bail()
    .isString()
    .withMessage('firstName must be a string')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('firstName must be between 2 and 60 characters'),

  body('lastName')
    .exists({ values: 'falsy' })
    .withMessage('lastName is required')
    .bail()
    .isString()
    .withMessage('lastName must be a string')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('lastName must be between 2 and 60 characters'),

  body('email')
    .exists({ values: 'falsy' })
    .withMessage('email is required')
    .bail()
    .isEmail()
    .withMessage('email must be a valid email address')
    .normalizeEmail(),

  body('organization')
    .exists({ values: 'falsy' })
    .withMessage('organization is required')
    .bail()
    .isString()
    .withMessage('organization must be a string')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('organization must be between 2 and 120 characters'),

  body('jobTitle')
    .exists({ values: 'falsy' })
    .withMessage('jobTitle is required')
    .bail()
    .isString()
    .withMessage('jobTitle must be a string')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('jobTitle must be between 2 and 120 characters'),

  body('bio')
    .exists({ values: 'falsy' })
    .withMessage('bio is required')
    .bail()
    .isString()
    .withMessage('bio must be a string')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('bio must be between 10 and 1000 characters'),

  body('photoUrl')
    .exists({ values: 'falsy' })
    .withMessage('photoUrl is required')
    .bail()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('photoUrl must be a valid http or https URL')
];

/* ------------------------------ sessions ------------------------------ */

const sessionRules = [
  body('eventId')
    .exists({ values: 'falsy' })
    .withMessage('eventId is required')
    .bail()
    .isMongoId()
    .withMessage('eventId must be a valid 24-character MongoDB ObjectId'),

  body('speakerId')
    .exists({ values: 'falsy' })
    .withMessage('speakerId is required')
    .bail()
    .isMongoId()
    .withMessage('speakerId must be a valid 24-character MongoDB ObjectId'),

  body('title')
    .exists({ values: 'falsy' })
    .withMessage('title is required')
    .bail()
    .isString()
    .withMessage('title must be a string')
    .trim()
    .isLength({ min: 3, max: 150 })
    .withMessage('title must be between 3 and 150 characters'),

  body('description')
    .exists({ values: 'falsy' })
    .withMessage('description is required')
    .bail()
    .isString()
    .withMessage('description must be a string')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('description must be between 10 and 2000 characters'),

  body('startTime')
    .exists({ values: 'falsy' })
    .withMessage('startTime is required')
    .bail()
    .isISO8601()
    .withMessage('startTime must be an ISO 8601 date, e.g. 2026-09-14T10:00:00Z'),

  body('endTime')
    .exists({ values: 'falsy' })
    .withMessage('endTime is required')
    .bail()
    .isISO8601()
    .withMessage('endTime must be an ISO 8601 date, e.g. 2026-09-14T11:00:00Z')
    .bail()
    // Cross-field check: unlike an event, a talk of zero length is meaningless.
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('endTime must be after startTime');
      }
      return true;
    }),

  body('room')
    .exists({ values: 'falsy' })
    .withMessage('room is required')
    .bail()
    .isString()
    .withMessage('room must be a string')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('room must be between 1 and 100 characters'),

  body('track')
    .exists({ values: 'falsy' })
    .withMessage('track is required')
    .bail()
    .isIn(TRACKS)
    .withMessage(`track must be one of: ${TRACKS.join(', ')}`),

  body('capacity')
    .exists({ values: 'falsy' })
    .withMessage('capacity is required')
    .bail()
    .isInt({ min: 1, max: 10000 })
    .withMessage('capacity must be an integer between 1 and 10000')
    .toInt()
];

const sessionQueryRules = [
  query('eventId')
    .optional()
    .isMongoId()
    .withMessage('eventId must be a valid 24-character MongoDB ObjectId'),
  query('speakerId')
    .optional()
    .isMongoId()
    .withMessage('speakerId must be a valid 24-character MongoDB ObjectId'),
  query('track')
    .optional()
    .isIn(TRACKS)
    .withMessage(`track must be one of: ${TRACKS.join(', ')}`)
];

/* ---------------------------- registrations ---------------------------- */

const registrationRules = [
  body('eventId')
    .exists({ values: 'falsy' })
    .withMessage('eventId is required')
    .bail()
    .isMongoId()
    .withMessage('eventId must be a valid 24-character MongoDB ObjectId'),

  body('attendeeName')
    .exists({ values: 'falsy' })
    .withMessage('attendeeName is required')
    .bail()
    .isString()
    .withMessage('attendeeName must be a string')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('attendeeName must be between 2 and 120 characters'),

  body('attendeeEmail')
    .exists({ values: 'falsy' })
    .withMessage('attendeeEmail is required')
    .bail()
    .isEmail()
    .withMessage('attendeeEmail must be a valid email address')
    .normalizeEmail(),

  body('ticketType')
    .exists({ values: 'falsy' })
    .withMessage('ticketType is required')
    .bail()
    .isIn(TICKET_TYPES)
    .withMessage(`ticketType must be one of: ${TICKET_TYPES.join(', ')}`),

  body('quantity')
    .exists({ values: 'falsy' })
    .withMessage('quantity is required')
    .bail()
    .isInt({ min: 1, max: 10 })
    .withMessage('quantity must be an integer between 1 and 10')
    .toInt(),

  // Note: `exists` is not used with `values: 'falsy'` here because a free
  // ticket legitimately costs 0.
  body('amountPaid')
    .exists()
    .withMessage('amountPaid is required')
    .bail()
    .isFloat({ min: 0, max: 100000 })
    .withMessage('amountPaid must be a number between 0 and 100000')
    .toFloat(),

  body('status')
    .exists({ values: 'falsy' })
    .withMessage('status is required')
    .bail()
    .isIn(REGISTRATION_STATUSES)
    .withMessage(`status must be one of: ${REGISTRATION_STATUSES.join(', ')}`)
];

const registrationQueryRules = [
  query('eventId')
    .optional()
    .isMongoId()
    .withMessage('eventId must be a valid 24-character MongoDB ObjectId'),
  query('status')
    .optional()
    .isIn(REGISTRATION_STATUSES)
    .withMessage(`status must be one of: ${REGISTRATION_STATUSES.join(', ')}`),
  query('attendeeEmail')
    .optional()
    .isEmail()
    .withMessage('attendeeEmail must be a valid email address')
    .normalizeEmail()
];

module.exports = {
  handleValidation,
  idParam,
  eventRules,
  eventQueryRules,
  eventCategoryQueryRule,
  speakerRules,
  sessionRules,
  sessionQueryRules,
  registrationRules,
  registrationQueryRules
};
