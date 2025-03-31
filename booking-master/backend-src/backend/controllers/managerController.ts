import { Request, Response, NextFunction } from 'express';
import { SESSION_ERROR, AUTH_LEVELS } from '../config';
import { AppError } from '../utilities';
import { ManagerService } from '../services';

export const checkAuthenticatedUser = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (req.session.user) {
			const manager = await ManagerService.getManager(req.session.user.id);
			if (manager == null) {
				throw new AppError(SESSION_ERROR, `manager ${req.session.user.id} not found`);
			}
			res.send({
				auth: manager.authLevel == AUTH_LEVELS.master ? 'master' : 'manager',
				username: manager.username,
			});
		} else {
			res.status(SESSION_ERROR).send('session does not exist');
		}
	} catch (e) {
		next(e);
	}
};
