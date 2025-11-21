import { Chess } from 'chess.js';
import dotenv from 'dotenv';
import { Db, MongoClient, ObjectId } from 'mongodb';
import { sendAutoResignNotification } from './emails/sendAutoResignNotification';

const pollIntervalSecs = Number(process.env.WORKER_POLL_INTERVAL_SECS ?? 120);
const autoResignNotificationHours = Number(
	process.env.AUTO_RESIGN_NOTIFICATION_HOURS ?? 48
);
const autoResignDelayHours = Number(process.env.AUTO_RESIGN_DELAY_HOURS ?? 24);
const autoResignMinGameLength = Number(
	process.env.AUTO_RESIGN_MIN_GAME_LENGTH ?? 4
);
const scoreFactor = 20;

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

let isShuttingDown = false;
let mongoClient: MongoClient | null = null;
let database: Db | null = null;

interface GameDoc {
	_id: ObjectId;
	whiteUserIds: ObjectId[];
	blackUserIds: ObjectId[];
	history: Array<{
		fen: string;
		date: Date;
		userId: ObjectId | null;
	}>;
	lastMoveDate?: Date | null;
	result?: string | null;
	autoResignNotificationDate?: Date | null;
}

interface UserDoc {
	_id: ObjectId;
	email: string;
	name?: string | null;
	preferredLocale?: string | null;
	unsubscribeDate?: Date | null;
}

async function getDb(): Promise<Db> {
	if (database) {
		return database;
	}

	const uri = process.env.MONGODB_URI ?? process.env.NITRO_MONGODB_URI;
	if (!uri) {
		throw new Error('MONGODB_URI is not set');
	}

	mongoClient = new MongoClient(uri);
	await mongoClient.connect();
	database = mongoClient.db(process.env.MONGODB_DB || 'distrochess3');
	return database;
}

async function shutdown(signal: NodeJS.Signals) {
	if (isShuttingDown) {
		return;
	}
	isShuttingDown = true;
	log('warn', 'Received shutdown signal', { signal });
	clearInterval(pollIntervalId);
	try {
		if (mongoClient) {
			await mongoClient.close();
		}
	} catch (error) {
		log('error', 'Failed to close MongoDB connection', {
			error: error instanceof Error ? error.message : error,
		});
	}
	process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('unhandledRejection', (reason: unknown) => {
	log('error', 'Unhandled rejection', { reason });
});

process.on('uncaughtException', (error: unknown) => {
	log('error', 'Uncaught exception', { error });
	void shutdown('SIGTERM');
});

function includesId(arr: any[] = [], id: any): boolean {
	return arr.some((x) => x != null && x.toString() === id.toString());
}

const pollIntervalId = setInterval(() => {
	log('info', 'polling...');
	void poll();
}, pollIntervalSecs * 1000);

async function poll(): Promise<void> {
	await sendAutoResignNotifications();
	await autoResign();
}

async function autoResign(): Promise<void> {
	const db = await getDb();
	const cutoff = new Date();
	cutoff.setHours(cutoff.getHours() - autoResignDelayHours);

	const games = await db
		.collection<GameDoc>('games')
		.find({
			autoResignNotificationDate: { $lt: cutoff },
		})
		.toArray();
	for (const game of games) {
		const latestFen = game.history?.[game.history.length - 1]?.fen;
		const chessGame = latestFen ? new Chess(latestFen) : new Chess();
		const userIds =
			chessGame.turn() === 'w' ? game.whiteUserIds : game.blackUserIds;

		db.collection<GameDoc>('games').updateOne(
			{ _id: game._id },
			{
				$set: {
					result: chessGame.turn() === 'w' ? 'black-win' : 'white-win',
					autoResignNotificationDate: null,
					autoResignDate: new Date(),
				},
			}
		);

		// now update scores
		const usersColl = db.collection('users');
		const winnerIds =
			(chessGame.turn() == 'b' ? game.whiteUserIds : game.blackUserIds) || [];

		const winnerMoveCounts: { [key: string]: number } = {};
		const loserMoveCounts: { [key: string]: number } = {};
		for (const h of game.history) {
			const id: string | null = h.userId?.toString() || null;
			if (id) {
				if (includesId(winnerIds, h.userId)) {
					if (!winnerMoveCounts[id]) {
						winnerMoveCounts[id] = 0;
					}
					winnerMoveCounts[id]++;
				} else {
					if (!loserMoveCounts[id]) {
						loserMoveCounts[id] = 0;
					}
					loserMoveCounts[id]++;
				}
			}
		}

		for (const userId in winnerMoveCounts) {
			const scoreChange =
				(scoreFactor * winnerMoveCounts[userId]) / game.history.length;
			await usersColl.updateOne(
				{ _id: new ObjectId(userId) },
				{ $inc: { score: scoreChange } }
			);
		}
		for (const userId in loserMoveCounts) {
			const scoreChange =
				(scoreFactor * loserMoveCounts[userId]) / game.history.length;
			// Ensure score does not go below 0
			const user = await usersColl.findOne({ _id: new ObjectId(userId) });
			const newScore = Math.max(0, (user?.score ?? 0) - scoreChange);
			await usersColl.updateOne(
				{ _id: new ObjectId(userId) },
				{ $set: { score: newScore } }
			);
		}
	}
}

async function sendAutoResignNotifications(): Promise<void> {
	try {
		const db = await getDb();
		const cutoff = new Date();
		cutoff.setHours(cutoff.getHours() - autoResignNotificationHours);

		const games = await db
			.collection<GameDoc>('games')
			.find({
				lastMoveDate: { $lt: cutoff },
				result: null,
				[`history.${autoResignMinGameLength}`]: { $exists: true },
				autoResignNotificationDate: null,
			})
			.toArray();

		log('info', `Found ${games.length} stale game(s). will notify players.`);
		await db.collection('games').updateMany(
			{
				_id: { $in: games.map((g) => g._id) },
			},
			{
				$set: {
					autoResignNotificationDate: new Date(),
				},
			}
		);

		for (const game of games) {
			const latestFen = game.history?.[game.history.length - 1]?.fen;
			const chessGame = latestFen ? new Chess(latestFen) : new Chess();
			const userIds =
				chessGame.turn() === 'w' ? game.whiteUserIds : game.blackUserIds;

			const users = await db
				.collection<UserDoc>('users')
				.find({
					_id: {
						$in: userIds,
					},
				})
				.toArray();

			for (const user of users) {
				try {
					log('info', 'Sending auto-resign notice', {
						gameId: game._id.toString(),
						userId: user._id.toString(),
					});
					await sendAutoResignNotification({
						user,
						gameId: game._id.toString(),
						autoResignDelayHours,
					});
				} catch (error) {
					log('error', 'Failed to send auto-resign notice', {
						gameId: game._id.toString(),
						userId: user._id.toString(),
						error:
							error instanceof Error
								? { message: error.message, stack: error.stack }
								: error,
					});
				}
			}
		}
	} catch (error) {
		const err = error as Error;
		log('error', 'Failed to load games from MongoDB', {
			message: err.message,
			stack: err.stack,
		});
	}
}
