# ConferenceHub API

REST API for organizing multi-day conferences and the events inside them. Built for the CSE 341 final project.

**Four collections — `events`, `speakers`, `sessions`, and `registrations`** — each with full CRUD, request validation, and centralized error handling. Every write route is behind GitHub OAuth, and the GET routes are covered by a Jest + Supertest suite.

| | |
|---|---|
| **Live API** | <https://final-project-cse-341-1b08.onrender.com> |
| **Swagger documentation** | <https://final-project-cse-341-1b08.onrender.com/api-docs> |
| **Repository** | <https://github.com/franciscorodriguezsv24/Final-project-cse-341> |
| **Video walkthrough** | <https://youtu.be/1aPzaH-voQs> |

---

## Running locally

```bash
git clone https://github.com/franciscorodriguezsv24/Final-project-cse-341.git
cd Final-project-cse-341
npm install

cp .env.example .env      # then fill in MONGODB_URI, SESSION_SECRET and the GitHub keys
npm run swagger           # regenerate swagger/swagger.json
npm test                  # run the unit tests
npm run dev               # starts on http://localhost:8080
```

Open <http://localhost:8080/api-docs> for the interactive documentation.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `SESSION_SECRET` | yes | Signs the session cookie; also stored in Render |
| `GITHUB_CLIENT_ID` | for OAuth | From the GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | for OAuth | From the GitHub OAuth app |
| `GITHUB_CALLBACK_URL` | for OAuth | Must match the callback registered on GitHub exactly |
| `MONGODB_DB_NAME` | no | Database name (defaults to `conferencehub`) |
| `PORT` | no | Listening port; Render sets this automatically |
| `NODE_ENV` | no | `production` hides error details and marks the cookie secure |
| `CORS_ORIGIN` | no | Allowed browser origin (defaults to `*`) |
| `SWAGGER_HOST` / `SWAGGER_SCHEME` | no | Baked into `swagger.json` at generation time |

`.env` is git-ignored. Every required key is documented in `.env.example`.

When the GitHub keys are absent the API still starts and serves every public route; `/auth/github` returns a `503` explaining what is missing, rather than crashing at boot.

---

## Authentication

Identity comes from GitHub via Passport.js. This API never sees or stores a password, and it does not keep the GitHub access token either — the token proves who you are once, and after that the session cookie does the work.

| Method | Route | Description |
|---|---|---|
| GET | `/auth/github` | Start the login. Open this in a browser tab |
| GET | `/auth/github/callback` | Where GitHub returns; creates the session and forwards to `/api-docs` |
| GET | `/auth/status` | Whether the current session is signed in, and as whom |
| GET | `/auth/logout` | Ends the session and clears the cookie |

**Signing in from Swagger UI:** open `/auth/github` in a browser tab, approve the app, and you land back on `/api-docs` with the session cookie set. Swagger UI is configured with `withCredentials`, so **Try it out** sends that cookie automatically and the protected routes start working. Hit `/auth/logout` and they return `401` again.

Sessions are stored in MongoDB rather than in memory, so a login survives Render restarting the free-tier instance.

### What is protected

`GET` routes are public — the conference programme is meant to be readable by anyone. Every **`POST`, `PUT` and `DELETE` on all four collections** requires a session: twelve protected routes in total. `requireAuth` is the first middleware on each of them, so an unauthenticated request is rejected before validation runs and before the database is touched.

```json
{
  "success": false,
  "error": {
    "status": 401,
    "message": "Authentication required. Sign in at /auth/github before writing data."
  }
}
```

---

## Endpoints

All responses are JSON and share the same envelope: `{ success, data }` on success, `{ success: false, error: { status, message, details? } }` on failure. 🔒 marks a route that requires sign-in.

### Events

| Method | Route | Description |
|---|---|---|
| GET | `/events` | All events, sorted by start date. Optional `?status=` and `?category=` |
| GET | `/events/findByCategory?category=` | Events in one category |
| GET | `/events/{eventId}` | A single event |
| GET | `/events/{eventId}/sessions` | Sessions belonging to an event |
| POST | `/events` | 🔒 Create an event |
| PUT | `/events/{eventId}` | 🔒 Replace an event |
| DELETE | `/events/{eventId}` | 🔒 Delete an event |

### Speakers

| Method | Route | Description |
|---|---|---|
| GET | `/speakers` | All speakers, sorted by last name. Optional `?organization=` |
| GET | `/speakers/{speakerId}` | A single speaker |
| GET | `/speakers/{speakerId}/sessions` | Sessions assigned to a speaker |
| POST | `/speakers` | 🔒 Create a speaker |
| PUT | `/speakers/{speakerId}` | 🔒 Replace a speaker |
| DELETE | `/speakers/{speakerId}` | 🔒 Delete a speaker |

### Sessions

| Method | Route | Description |
|---|---|---|
| GET | `/sessions` | All sessions, sorted by start time. Optional `?eventId=`, `?speakerId=`, `?track=` |
| GET | `/sessions/{sessionId}` | A single session |
| POST | `/sessions` | 🔒 Create a session |
| PUT | `/sessions/{sessionId}` | 🔒 Replace a session |
| DELETE | `/sessions/{sessionId}` | 🔒 Delete a session |

### Registrations

| Method | Route | Description |
|---|---|---|
| GET | `/registrations` | All registrations, newest first. Optional `?eventId=`, `?status=`, `?attendeeEmail=` |
| GET | `/registrations/{registrationId}` | A single registration |
| POST | `/registrations` | 🔒 Create a registration |
| PUT | `/registrations/{registrationId}` | 🔒 Replace a registration |
| DELETE | `/registrations/{registrationId}` | 🔒 Delete a registration |

### Service

| Method | Route | Description |
|---|---|---|
| GET | `/` | API metadata and the auth routes |
| GET | `/health` | Health check used by Render |
| GET | `/api-docs` | Swagger UI |

---

## Data model

**`events`** — 12 fields including `_id`

`_id`, `title`, `description`, `startDate`, `endDate`, `location`, `capacity`, `category`, `ticketPrice`, `status`, `organizerId`, `createdAt`

`category` is one of `technology, business, health, education, science, arts, community, other`.
`status` is one of `draft, published, cancelled`.
`organizerId` is optional in the request body: when it is omitted, the signed-in user becomes the organizer, so ownership is taken from the session rather than trusted from the client.

**`speakers`** — 8 fields including `_id`

`_id`, `firstName`, `lastName`, `email`, `organization`, `jobTitle`, `bio`, `photoUrl`

**`sessions`** — 11 fields including `_id`

`_id`, `eventId`, `speakerId`, `title`, `description`, `startTime`, `endTime`, `room`, `track`, `capacity`, `createdAt`

`track` is one of `general, frontend, backend, cloud, data, career, workshop`.

**`registrations`** — 9 fields including `_id`

`_id`, `eventId`, `attendeeName`, `attendeeEmail`, `ticketType`, `quantity`, `amountPaid`, `status`, `registeredAt`

`ticketType` is one of `general, student, vip, speaker`.
`status` is one of `pending, confirmed, cancelled`. A cancelled registration releases its seats back to the event.

**`users`** — created on first GitHub sign-in

`_id`, `githubId`, `username`, `displayName`, `email`, `avatarUrl`, `createdAt`, `lastLoginAt`

Indexes created at startup: `events.startDate`; unique `speakers.email`; `sessions.{eventId, startTime}` and `sessions.speakerId`; unique `registrations.{eventId, attendeeEmail}`; unique `users.githubId`.

---

## Validation and error handling

Validation runs as middleware before any controller, so no invalid data reaches the database layer.

- **Every field is checked** for presence, type, length, and allowed values on the `POST` and `PUT` routes of all four collections. `express-validator` collects *all* failures and returns them together, so a client fixes every problem in one round trip rather than one at a time.
- **Cross-field rules** are enforced where the fields are only wrong in combination — an event whose `endDate` falls before its `startDate`, or a session whose `endTime` is not strictly after its `startTime`, is rejected.
- **ObjectIds are validated before use**, so a malformed id returns a clean `400` instead of throwing inside the MongoDB driver.
- **References are checked before a write lands.** A session naming an event or speaker that does not exist reports both bad ids at once as a `400`, in the same shape as a field validation failure.
- **Business rules are enforced where the data could otherwise go wrong**: two sessions cannot occupy the same room at overlapping times, one attendee cannot register twice for the same event, and an event cannot sell more seats than its capacity.
- **Referential integrity is protected on delete.** Removing an event that still has sessions or registrations, or a speaker still assigned to sessions, returns `409` rather than silently orphaning records.
- **One central error handler** shapes every failure. In production, unexpected `5xx` errors log the stack server-side and return a generic message, so internals are never leaked to the client.

### Status codes

| Code | When |
|---|---|
| `200` | Successful GET, PUT, DELETE |
| `201` | Successful POST |
| `400` | Validation failed, malformed ObjectId, malformed JSON body, or a reference that does not exist |
| `401` | A write route was called without signing in |
| `404` | The id is valid but no such document exists, or the route is unknown |
| `409` | Duplicate email, room double-booking, sold-out event, or a delete blocked by existing references |
| `500` | Unexpected server error |
| `503` | OAuth was called on a server where the GitHub keys are not configured |

A validation failure lists each offending field:

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Validation failed",
    "details": [
      { "field": "capacity", "message": "capacity must be an integer between 1 and 100000", "value": -5 },
      { "field": "category", "message": "category must be one of: technology, business, ...", "value": "underwater-basket-weaving" }
    ]
  }
}
```

---

## Testing

```bash
npm test
```

**70 tests across 6 suites**, using Jest and Supertest. They are unit tests: `config/db` is mocked, so the suite runs with no database, no `.env`, and no network — the same on a laptop and in CI.

| Suite | Covers |
|---|---|
| `tests/events.test.js` | All four events GET routes: list, filters, `findByCategory`, by id, sub-resource, plus the `400` and `404` paths |
| `tests/speakers.test.js` | All three speakers GET routes, sort order, the organization filter, `400` and `404` |
| `tests/sessions.test.js` | Both sessions GET routes, each query filter, ObjectId conversion, `400` and `404` |
| `tests/registrations.test.js` | Both registrations GET routes, each query filter, ObjectId conversion, `400` and `404` |
| `tests/auth.test.js` | `/auth/status`, all twelve protected routes returning `401` when signed out, and the public GET routes staying open |
| `tests/writeRoutes.test.js` | POST/PUT/DELETE behaviour with a stubbed session: the conflict rules, reference checks, and preserved `createdAt` |

Each GET and GETALL route is asserted on three axes: the success shape and count, the filter the controller actually builds, and the failure paths. `expect(collection.find).not.toHaveBeenCalled()` is used to prove that a rejected request never reached the database, which a status-code assertion alone would not show.

---

## Project structure

```
app.js                     Express app: middleware, session, Passport, routes, error handler
server.js                  Entry point: connects to MongoDB, then listens
config/db.js               Single shared MongoDB connection and index creation
config/passport.js         GitHub OAuth strategy and session serialization
routes/index.js            Mounts every router
routes/auth.js             Login, callback, status, logout
routes/*.js                One router per collection + Swagger annotations
controllers/               Request logic and database calls, one file per collection
models/                    Document shape for each collection
middleware/auth.js         requireAuth gate for every write route
middleware/validate.js     Validation rules per resource + the 400 formatter
middleware/errorHandler.js 404 catch-all and the central error handler
swagger/swagger.js         Generates swagger.json from the route annotations
swagger/swagger.json       Generated spec served at /api-docs
tests/                     Jest + Supertest suites and the database test doubles
routes.rest                Manual request suite for the VS Code REST Client
```

The app is defined in `app.js` and started in `server.js`. That split is what lets the tests import the app without opening a port or a database connection.

---

## Security

- No secrets in the repository — everything sensitive is read from `process.env`, `.env` is git-ignored, and `.env.example` documents each required key with placeholders only.
- Passwords are never handled: GitHub is the identity provider, and the OAuth access token is deliberately not stored, because this API only needs GitHub to prove who you are.
- The session cookie is `httpOnly`, `sameSite: lax`, and `secure` in production. Only the user id is stored in it; the profile is read back from the database on each request.
- `helmet` sets secure HTTP headers; CORS is configured with an explicit origin and `credentials: true`.
- User input is never concatenated into a query object, and JSON bodies are capped at 100 kB.
- `trust proxy` is enabled so Render's TLS termination is handled correctly — without it the secure cookie would never be set.

---

## Deploying to Render

1. Create a **Web Service** pointing at this repository, with automatic deploys from `main`.
2. Build command `npm install`, start command `npm start`, health check path `/health`.
3. Add the environment variables `MONGODB_URI`, `MONGODB_DB_NAME`, `NODE_ENV=production`, `CORS_ORIGIN`, `SESSION_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `GITHUB_CALLBACK_URL`.
4. Register the GitHub OAuth app at <https://github.com/settings/developers> with the callback `https://final-project-cse-341-1b08.onrender.com/auth/github/callback`. It must match `GITHUB_CALLBACK_URL` character for character or GitHub refuses the redirect. An OAuth app accepts only one callback URL, so local development needs a second app of its own.
5. In MongoDB Atlas, allow `0.0.0.0/0` under Network Access — Render's free tier has no static outbound IP.
6. Confirm the deployment at `/health`, the documentation at `/api-docs`, and the login at `/auth/github`.

`render.yaml` is included as a Blueprint if you prefer to configure the service from the repository. Secrets are marked `sync: false` and are still entered in the dashboard; `SESSION_SECRET` uses `generateValue: true` so Render creates it.

Swagger's `host` and `scheme` are rewritten from the incoming request at serve time, so **Try it out** works against both `localhost` and the Render URL without regenerating the spec.

---

## Individual contributions — Week 07 (final deliverable)

This project is being completed individually, so both contributions below are my own.

**Alejandro Rodríguez — contribution 1: getting the deployed service working end to end against the real Render URL.**
Took the API from "deploys" to "actually usable in a browser." Fixed the CORS configuration that was rejecting requests from the deployed documentation page, and corrected the environment-variable setup that was failing on Render. Replaced every `<your-service>` placeholder across `README.md`, `routes.rest`, and `.env.example` with the real service URL, so the REST client file and the setup instructions both work by copy-paste instead of needing hand-editing. Registered the GitHub OAuth app against the deployed callback URL and verified the full path on the live service: `/health`, `/api-docs`, all four collection GET routes, and a real sign-in round trip. Also removed a GitHub client secret that had been committed to `.env.example`, so what ships in the repository is placeholders only.

**Alejandro Rodríguez — contribution 2: making the Swagger page work as a real REST client, including authentication.**
Fixed the one place the documentation genuinely misled a reader. `GET /auth/github` answers with a 302 to github.com, and the browser refuses to let Swagger's JavaScript follow a cross-site redirect, so pressing **Execute** reported a red "Failed to fetch" even though the route worked — which reads as a broken API. Added a clickable "Sign in with GitHub" link to the spec description and to the route's own description, so authorization happens as a real browser navigation and the reader lands back on `/api-docs` holding a session cookie that **Try it out** then reuses on all twelve protected routes. Rewrote the top-level API description into a proper authentication section explaining what is public, what needs a sign-in, why Execute fails on that one route, and where to check or end the session. Wrote the recording script that walks the rubric item by item, and confirmed the 70-test suite still passes against the final state of the code.

---

## Individual contributions — Week 06

**Alejandro Rodríguez — contribution 1: the `sessions` and `registrations` collections, with validation on all four collections.**
Designed and implemented both remaining collections end to end — ten routes, their document shapes (11 fields for `sessions`, 9 for `registrations`), and their `express-validator` rule sets, bringing POST and PUT validation to all four collections. Added the checks that a database schema alone cannot express: a session must name an event and a speaker that actually exist (and reports both bad ids together, in the same response shape as a field error), no two sessions may occupy the same room at overlapping times, one attendee may not register twice for the same event, and an event may not sell more seats than its capacity — with cancelled registrations correctly releasing their seats back. Extended the startup indexes, including the unique compound index that enforces the duplicate-registration rule under concurrent requests.

**Alejandro Rodríguez — contribution 2: GitHub OAuth and the automated test suite.**
Implemented authentication with Passport.js and the GitHub strategy, backed by MongoDB-stored sessions so a login survives a Render restart, and put `requireAuth` in front of all twelve write routes as the outermost middleware so an unauthenticated request is refused before validation or any database call. Made the API degrade honestly rather than crash when the OAuth keys are absent, and changed event ownership to come from the session instead of a client-supplied `organizerId`. Split `app.js` from `server.js` so the app can be imported without opening a port, then built the 70-test Jest and Supertest suite — covering every GET and GETALL route on all four collections, the 401 on all twelve protected routes, and the conflict rules — against mocked database doubles so it runs with no database and no secrets.

---

## Next iteration

- Ownership rules on top of authentication, so an organizer can only modify the events they created.
- Attendee-facing registration flow: a signed-in user registering themselves rather than an organizer entering the record.
- Pagination on the list routes once the collections grow past a single page.
