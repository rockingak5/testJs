import { NextFunction, Request, Response } from 'express';
import { LineService } from '../services';
import { SESSION_ERROR, ERROR_MESSAGES } from '../config';
import { AppError } from '../utilities';

export const checkSession = (req: Request, res: Response, next: NextFunction) => {
	try {
		if (req.session.user == null) {
			throw new AppError(SESSION_ERROR, 'session does not exist', false);
		}
		next();
	} catch (e) {
		next(e);
	}
};
export const checkLineProfile = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.headers['access-token']) {
			throw new AppError(SESSION_ERROR, 'access-token', false);
		}
		const isVerified = await LineService.verifyAccessToken(req.headers['access-token'] as string);
		if (!isVerified) {
			throw new AppError(SESSION_ERROR, ERROR_MESSAGES.LINE_NOT_VERIFIED, false);
		}
		const memberLine = await LineService.getProfileByToken(req.headers['access-token'] as string);
		if (!memberLine) {
			throw new AppError(SESSION_ERROR, 'profile not found', false);
		}
		res.locals.memberLine = memberLine;
		next();
	} catch (e) {
		next(e);
	}
};
