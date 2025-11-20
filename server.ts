import dotenv from 'dotenv';

// Load .env values during local development. Heroku injects env vars automatically.
if (process.env.NODE_ENV !== 'production') {
	dotenv.config();
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const levelWeights: Record<LogLevel, number> = {
	debug: 10,
	info: 20,
	warn: 30,
	error: 40,
};

const currentLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info';

const log = (
	level: LogLevel,
	message: string,
	meta: Record<string, unknown> = {}
) => {
	if (levelWeights[level] < levelWeights[currentLevel]) {
		return;
	}

	const payload = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
	const format = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}${payload}`;

	switch (level) {
		case 'warn':
			console.warn(format);
			break;
		case 'error':
			console.error(format);
			break;
		default:
			console.log(format);
	}
};

const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 60_000);
let isShuttingDown = false;

async function runJobCycle(): Promise<void> {
	// Replace the placeholder implementation with the actual business logic.
	log('info', 'Worker heartbeat', { pollIntervalMs });
}

async function tick(): Promise<void> {
	if (isShuttingDown) {
		return;
	}

	try {
		await runJobCycle();
	} catch (error) {
		log('error', 'Job cycle failed', { error });
	}
}

const timer = setInterval(() => {
	void tick();
}, pollIntervalMs);

// Run immediately instead of waiting for the first interval.
void tick();

const shutdown = async (signal: NodeJS.Signals) => {
	if (isShuttingDown) {
		return;
	}
	isShuttingDown = true;
	log('warn', 'Received shutdown signal', { signal });
	clearInterval(timer);
	process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason: unknown) => {
	log('error', 'Unhandled rejection', { reason });
});

process.on('uncaughtException', (error: unknown) => {
	log('error', 'Uncaught exception', { error });
	void shutdown('SIGTERM');
});
