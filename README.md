# TaskFlow

TaskFlow is a full stack task manager with a React and Vite client, an Express API, and MongoDB storage. It includes task boards, priorities, checklists, focus timing, account profiles, and completion rewards.

## Requirements

- Node.js 20.19+ or 22.12+
- MongoDB 6.0+ (local or MongoDB Atlas)

## Local setup

1. Install dependencies: `npm run install:all`.
2. Copy `server/.env.example` to `server/.env` and set `MONGO_URI` plus a random `JWT_SECRET` of at least 32 characters.
3. Start both services from the project root with `npm run dev`.
4. Open `http://127.0.0.1:5173`. The Vite server proxies `/api` and `/health` to the API at `http://127.0.0.1:5000`.

For MongoDB Atlas, use its connection string and allow the development machine's IP in the Atlas network access settings. The API starts even if MongoDB is temporarily unreachable; `/health/live` reports process health and `/health/ready` reports database readiness. API requests return `503` while the database is unavailable, and the server retries the connection.

## Commands

- `npm run dev` — start the API and Vite development server together.
- `npm run dev:server` / `npm run dev:client` — start one service.
- `npm run build` — create the production client bundle in `client/dist`.
- `npm run lint` — lint the client.
- `npm test` — run the backend validation and task-state unit tests.
- `npm start` — start the API for production.

The CI workflow runs the backend tests, client lint, and production build for pushes and pull requests.

The backend tests exercise the HTTP routes with isolated in-memory model doubles, so they do not require a live database. They verify application behavior but do not replace a deployment-level MongoDB integration check.

## Configuration

The API reads `server/.env`; see `server/.env.example`. `CLIENT_ORIGIN` is a comma-separated list of allowed browser origins. In production, set it to the exact HTTPS frontend origin, use a managed MongoDB instance, provide a unique high-entropy `JWT_SECRET`, and set `NODE_ENV=production`. If the client and API are on different sites, configure HTTPS, `COOKIE_SAME_SITE=None`, and the API URL in `client/.env` (`VITE_API_BASE_URL=https://api.example.com/api`). For same-site deployments, keep the default `Lax` cookie policy and serve the API under the same origin when possible.

Authentication uses an HttpOnly session cookie. The browser stores only the non-sensitive profile needed to render the dashboard. Task ownership is checked on every API operation, input is validated server side, authentication attempts are rate limited, and task completion rewards are awarded once by the API.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/:id`, `DELETE /api/tasks/:id`
- `GET /health/live`, `GET /health/ready`

## Deployment notes

Build and deploy `client/dist` to a static host, run the API with `npm start`, and connect both to a production MongoDB database. Configure the static host to route `/api/*` and `/health/*` to the API, or set `VITE_API_BASE_URL` before building when deploying the services separately. Use HTTPS, restrict database network access, and keep all `.env` files out of version control.

web link:https://task-tracker-ten-rust.vercel.app/
