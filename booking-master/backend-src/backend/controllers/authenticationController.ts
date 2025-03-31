import { NextFunction, Request, Response } from 'express';
import { systemConfig, PERMISSION_ERROR, RESPONSE_SUCCESS } from '../config';
import { AppError, comparePassword, writeLog } from '../utilities';
import { ManagerService } from '../services';

export const Login = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!(req.body.username && req.body.password)) {
			throw new AppError(PERMISSION_ERROR, 'invalid parameters', false);
		}
		let loggedUser: managerSessionDataType | null;
		const manager = await ManagerService.findManagerByUsername(req.body.username);
		if (manager == null) {
			throw new AppError(PERMISSION_ERROR, 'email or password mismatch', false);
		}
		const isMatch = await comparePassword(req.body.password, manager.pwhash);
		if (isMatch) {
			loggedUser = {
				id: manager.managerId,
				role: 10,
				expires: 86400,
			};
			req.session.user = loggedUser;
			res.cookie(systemConfig.SESS_NAME as string, manager.managerId, { maxAge: 86400 });
			res.sendStatus(RESPONSE_SUCCESS);
		} else {
			throw new AppError(PERMISSION_ERROR, 'email or password mismatch', false);
		}
	} catch (e) {
		next(e);
	}
};

export const Logout = (req: Request, res: Response, next: NextFunction) => {
	try {
		req.session?.destroy((err: Error) => {
			err?.toString ? writeLog(err.toString(), 'error') : null;
		});
		res.clearCookie(systemConfig.SESS_SEC as string);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
