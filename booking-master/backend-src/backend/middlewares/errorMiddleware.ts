import { NextFunction, Request, Response } from 'express';
import { ValidationError } from 'express-json-validator-middleware';

import { SYSTEM_ERROR, systemConfig } from '../config';
import { AppError, writeLog } from '../utilities';

// Error handling Middleware function for logging the error message
const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
	if (err instanceof ValidationError) {
		// Handle the error
		res.status(400).json({
			message: 'Invalid request data',
			errors: err.validationErrors,
		});
	} else if (err instanceof AppError && err.isLog == false) {
		next(err); // calling next middleware
	} else {
		writeLog(
			{
				path: `${req.method} ${req.path} ${err.message}`,
				stack: err.stack,
			},
			(err as AppError).statusCode === SYSTEM_ERROR ? 'crit' : 'info',
		);
		next(err); // calling next middleware
	}
};

// Error handling Middleware function reads the error message
// and sends back a response in JSON format
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorResponder = (err: AppError, req: Request, res: Response, next: NextFunction) => {
	res.setHeader('Content-Type', 'application/json');
	const status = err.statusCode || SYSTEM_ERROR;
	res.status(status).send(err.message);
};

export { errorLogger, errorResponder };
