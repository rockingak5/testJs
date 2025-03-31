import path = require('path');
import cors = require('cors');
import express = require('express');
import session = require('express-session');
import helmet from 'helmet';
import { LINE_SIGNATURE_HTTP_HEADER_NAME } from '@line/bot-sdk';
import { systemConfig } from '../config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SequelizeStore = require('connect-session-sequelize')(session.Store);
import { router as apiRoute } from '../routers';
import type { Application } from 'express';
import type { DbType } from '../types/db';

declare module 'express-session' {
	export interface SessionData {
		user: managerSessionDataType;
	}
}
//cors
const corsOrigins = systemConfig.ENV_TEST
	? systemConfig.NGROK_URI
		? ['http://localhost:3000', systemConfig.NGROK_URI]
		: ['http://localhost:3000']
	: [systemConfig.SITE_URI, 'https://status-check.testweb-demo.com'];
const corsOptions = {
	allowedHeaders: [
		'Origin',
		'X-Requested-With',
		'Content-Type',
		'Accept',
		'X-Access-Token',
		'Authorization',
		'access-token',
		'Kakeru-Token',
		LINE_SIGNATURE_HTTP_HEADER_NAME,
	],
	credentials: true,
	methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
	origin: corsOrigins,
	preflightContinue: false,
};

const pathSessionCheck =
	(fn: CallableFunction) => (req: express.Request, res: express.Response, next: express.NextFunction) =>
		['/api/m/', '/api/auth', '/api/login', '/api/sess', '/api/logout'].some((uripath) => req.path.includes(uripath))
			? fn(req, res, next)
			: next();

export function initializeExpress(app: Application, db: DbType) {
	app.disable('x-powered-by');
	app.use(cors(corsOptions));
	app.use(/\/api\/((?!line).)*/, helmet(), express.json(), express.urlencoded({ extended: true }));

	app.use(
		pathSessionCheck(
			session({
				secret: systemConfig.SESS_SEC,
				store: new SequelizeStore({
					db: db.sequelize,
					table: db.sessions.name,
					tableName: db.sessions.tableName,
					checkExpirationInterval: 60 * 60 * 1000,
				}),
				name: systemConfig.SESS_NAME,
				resave: false,
				saveUninitialized: false,
				cookie: {
					sameSite: 'strict',
					maxAge: 86400000 * 7,
				},
			}),
		),
	);
	// use build folder of react to use as client
	app.use(express.static(path.join(process.cwd(), 'frontend', 'build')));
	// router
	app.use('/api', apiRoute);
	app.use(express.static(path.join(process.cwd(), 'public')));
	app.get('/*', (req, res) => {
		res.sendFile(path.join(process.cwd(), 'frontend', 'build', 'index.html'), function (err) {
			if (err) {
				res.status(500).send(err);
			}
		});
	});
}
