process.on('SIGTERM', () => {
	console.log(`Process ${process.pid} received a SIGTERM signal`);
	process.exit(0);
});
process.on('SIGINT', () => {
	console.log(`Process ${process.pid} has been interrupted`);
	process.exit(0);
});
process.on('uncaughtException', (err) => {
	console.log(`Uncaught Exception: ${err.message}`);
	process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
	console.log(`Unhandled rejection at ${promise} reason: ${reason}`);
	process.exit(1);
});
import 'dotenv/config';
import http = require('http');
import express = require('express');
import { systemConfig } from './backend/config';
import { attachSocketServer } from './backend/loaders/socketioLoader';
import { initializeScheduledTask } from './backend/loaders/scheduledTaskLoader';
import { getDB, initializeDatabase } from './backend/loaders/databaseLoader';
import { initializeExpress } from './backend/loaders/expressLoader';
import { connectRedis } from './backend/utilities/initRedis';

async function main() {
	try {
		const app = express();
		const server = http.createServer(app);
		attachSocketServer(server);
		const db = getDB();
		await initializeDatabase(db);
		initializeExpress(app, db);
		await initializeScheduledTask();
		await connectRedis();
		//load app
		server.listen(systemConfig.PORT);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}

main();
