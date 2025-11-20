# distrochess3-worker

A lightweight TypeScript worker intended to run background tasks for the distrochess3 platform. The codebase targets Heroku's worker dyno type but can also be executed locally with Node.js v20+.

## Local development

```bash
npm install
npm run start:dev
```

The development command uses `ts-node-dev` for auto-reload. Runtime configuration is provided through environment variables. Copy `.env.example` to `.env` for local testing.

## Production build

```bash
npm run build
npm start
```

`npm start` executes the compiled JavaScript inside `dist/`.

## Configuration

| Variable                  | Description                                               | Default |
| ------------------------- | --------------------------------------------------------- | ------- |
| `WORKER_POLL_INTERVAL_MS` | Delay between job cycles. Increase for lighter workloads. | `60000` |
| `LOG_LEVEL`               | One of `debug`, `info`, `warn`, `error`.                  | `info`  |

Add project-specific secrets (database URLs, API tokens, etc.) as additional environment variables.

## Deploying to Heroku

1. Create (or target) the app: `heroku create distrochess3-worker`.
2. Set configuration vars:
   ```bash
   heroku config:set WORKER_POLL_INTERVAL_MS=60000 LOG_LEVEL=info
   ```
3. Push the code: `git push heroku main`.
4. Enable the worker dyno: `heroku ps:scale worker=1`.
5. Tail logs to confirm activity: `heroku logs --tail`.

The provided `Procfile` registers the TypeScript worker as the only process type. During the slug build Heroku runs `npm install` followed by `npm run heroku-postbuild`, producing the compiled JavaScript that the worker executes.
