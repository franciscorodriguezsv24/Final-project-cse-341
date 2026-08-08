# ConferenceHub API

REST API for organizing multi-day conferences and the events inside them. Built for the CSE 341 final project.

This release covers the **first two collections — `events` and `speakers`** — with full CRUD, request validation, and centralized error handling. Sessions, attendees, registrations, and GitHub OAuth follow in the next iteration.

| | |
|---|---|
| **Live API** | `https://<your-service>.onrender.com` |
| **Swagger documentation** | `https://<your-service>.onrender.com/api-docs` |
| **Repository** | `https://github.com/franciscorodriguezsv24/Final-project-cse-341` |
| **Video walkthrough** | `https://youtu.be/<video-id>` |

> Replace the three placeholders above once the service is deployed and the video is uploaded.

---

## Running locally

```bash
git clone https://github.com/franciscorodriguezsv24/Final-project-cse-341.git
cd Final-project-cse-341
npm install

cp .env.example .env      # then fill in MONGODB_URI
npm run swagger           # regenerate swagger/swagger.json
npm run dev               # starts on http://localhost:8080
```

Open <http://localhost:8080/api-docs> for the interactive documentation.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | no | Database name (defaults to `conferencehub`) |
| `PORT` | no | Listening port; Render sets this automatically |
| `NODE_ENV` | no | `production` hides error details from responses |
| `CORS_ORIGIN` | no | Allowed browser origin (defaults to `*`) |
| `SWAGGER_HOST` / `SWAGGER_SCHEME` | no | Baked into `swagger.json` at generation time |

`.env` is git-ignored. Every required key is documented in `.env.example`.

---

## Endpoints

All responses are JSON and share the same envelope: `{ success, data }` on success, `{ success: false, error: { status, message, details? } }` on failure.

### Events

| Method | Route | Description |
|---|---|---|
| GET | `/events` | All events, sorted by start date. Optional `?status=` and `?category=` |
| GET | `/events/findByCategory?category=` | Events in one category |
| GET | `/events/{eventId}` | A single event |
| GET | `/events/{eventId}/sessions` | Sessions belonging to an event |
| POST | `/events` | Create an event |
| PUT | `/events/{eventId}` | Replace an event |
| DELETE | `/events/{eventId}` | Delete an event |

### Speakers

| Method | Route | Description |
|---|---|---|
| GET | `/speakers` | All speakers, sorted by last name. Optional `?organization=` |
| GET | `/speakers/{speakerId}` | A single speaker |
| GET | `/speakers/{speakerId}/sessions` | Sessions assigned to a speaker |
| POST | `/speakers` | Create a speaker |
| PUT | `/speakers/{speakerId}` | Replace a speaker |
| DELETE | `/speakers/{speakerId}` | Delete a speaker |

### Service

| Method | Route | Description |
|---|---|---|
| GET | `/` | API metadata |
| GET | `/health` | Health check used by Render |
| GET | `/api-docs` | Swagger UI |

The two `/sessions` sub-routes query the `sessions` collection, which is implemented next. Until then they correctly return an empty list for an existing parent and `404` for one that does not exist.

---

## Data model

**`events`** — 12 fields including `_id`

`_id`, `title`, `description`, `startDate`, `endDate`, `location`, `capacity`, `category`, `ticketPrice`, `status`, `organizerId`, `createdAt`

`category` is one of `technology, business, health, education, science, arts, community, other`.
`status` is one of `draft, published, cancelled`.

**`speakers`** — 8 fields including `_id`

`_id`, `firstName`, `lastName`, `email`, `organization`, `jobTitle`, `bio`, `photoUrl`

Indexes created at startup: `events.startDate`, and a unique index on `speakers.email`.

> `organizerId` currently arrives in the request body. Once GitHub OAuth is added it will be taken from the authenticated session instead of trusting the client.

---

## Validation and error handling

Validation runs as middleware before any controller, so no invalid data reaches the database layer.

- **Every field is checked** for presence, type, length, and allowed values. `express-validator` collects *all* failures and returns them together, so a client fixes every problem in one round trip rather than one at a time.
- **Cross-field rules** are enforced where the fields are only wrong in combination — an event whose `endDate` falls before its `startDate` is rejected.
- **ObjectIds are validated before use**, so a malformed id returns a clean `400` instead of throwing inside the MongoDB driver.
- **Referential integrity is protected on delete.** Removing an event that still has sessions or registrations, or a speaker still assigned to sessions, returns `409` rather than silently orphaning those records.
- **One central error handler** shapes every failure. In production, unexpected `5xx` errors log the stack server-side and return a generic message, so internals are never leaked to the client.

### Status codes

| Code | When |
|---|---|
| `200` | Successful GET, PUT, DELETE |
| `201` | Successful POST |
| `400` | Validation failed, malformed ObjectId, or malformed JSON body |
| `404` | The id is valid but no such document exists, or the route is unknown |
| `409` | Duplicate speaker email, or a delete blocked by existing references |
| `500` | Unexpected server error |

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

## Project structure

```
server.js                  Entry point: middleware, routes, error handler, startup
config/db.js               Single shared MongoDB connection and index creation
routes/index.js            Mounts every router
routes/events.js           Event routes + Swagger annotations
routes/speakers.js         Speaker routes + Swagger annotations
controllers/               Request logic and database calls, one file per collection
models/                    Document shape for each collection
middleware/validate.js     Validation rules per resource + the 400 formatter
middleware/errorHandler.js 404 catch-all and the central error handler
swagger/swagger.js         Generates swagger.json from the route annotations
swagger/swagger.json       Generated spec served at /api-docs
routes.rest                Manual request suite for the VS Code REST Client
```

Routes stay readable as a table of contents of the API, while the logic that is likely to grow lives in the controllers.

---

## Security

- No secrets in the repository — everything sensitive is read from `process.env`, `.env` is git-ignored, and `.env.example` documents each required key.
- `helmet` sets secure HTTP headers; CORS is configured with an explicit origin and `credentials: true`.
- User input is never concatenated into a query object, and JSON bodies are capped at 100 kB.
- `trust proxy` is enabled so Render's TLS termination is handled correctly — this is also what the secure session cookie will need once OAuth is added.

---

## Deploying to Render

1. Create a **Web Service** pointing at this repository, with automatic deploys from `main`.
2. Build command `npm install`, start command `npm start`, health check path `/health`.
3. Add the environment variables `MONGODB_URI`, `MONGODB_DB_NAME`, `NODE_ENV=production`, and `CORS_ORIGIN`.
4. In MongoDB Atlas, allow `0.0.0.0/0` under Network Access — Render's free tier has no static outbound IP.
5. Confirm the deployment at `/health` and the documentation at `/api-docs`.

`render.yaml` is included as a Blueprint if you prefer to configure the service from the repository. Secrets are marked `sync: false` and are still entered in the dashboard.

Swagger's `host` and `scheme` are rewritten from the incoming request at serve time, so **Try it out** works against both `localhost` and the Render URL without regenerating the spec.

---

## Individual contributions — Week 05

This project is being completed individually, so both contributions below are my own.

**Alejandro Rodríguez — contribution 1: events and speakers collections with full CRUD and validation.**
Designed both collections to the field counts set out in the project proposal (12 fields for `events`, 8 for `speakers`), and implemented all fourteen routes across them. Wrote the per-resource validation rules with `express-validator`, including the cross-field rule rejecting an event that ends before it starts, and built the centralized error handler that gives every failure the same JSON shape. Added referential guards so deleting an event or speaker that is still referenced returns `409` instead of orphaning records, and verified the `404`-before-`409` ordering so a missing id always reports as missing.

**Alejandro Rodríguez — contribution 2: Swagger documentation, project architecture, and deployment setup.**
Set up the MVC-style layered structure described in the proposal (`config`, `routes`, `controllers`, `models`, `middleware`, `swagger`) and the single shared MongoDB connection with startup index creation. Wrote the `swagger-autogen` generation script with request/response schemas and documented error responses for every endpoint, and made the served spec rewrite its host and scheme per request so **Try it out** works both locally and on Render. Prepared the deployment configuration, `.env.example`, and the `routes.rest` suite used to test every route and error path against the deployed service.

---

## Next iteration

- `sessions`, `attendees`, and `registrations` collections with CRUD and validation.
- GitHub OAuth via Passport.js, with `isAuthenticated` on every write route and `isOrganizer` for event, session, and speaker management.
- Unit tests for the GET routes with Jest and Supertest.
- `organizerId` taken from the authenticated session rather than the request body.
