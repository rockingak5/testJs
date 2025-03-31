import { Request, Response, NextFunction } from 'express';
import { RESPONSE_SUCCESS, SYSTEM_ERROR } from '../config';
import { SpectatorService } from '../services';
import { AppError } from '../utilities';

export const listPossibleSpectators = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const spectators = await SpectatorService.listSpectatorCandidates();
		res.send(spectators);
	} catch (e) {
		next(e);
	}
};

export const listSpectators = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const spectators = await SpectatorService.listSpectators();
		res.send(spectators);
	} catch (e) {
		next(e);
	}
};

export const bulkEditSpectators = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const spectators = req.body.spectators;
		if (!Array.isArray(spectators) || spectators.length == 0 || spectators.some((m) => !m.memberId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		await SpectatorService.bulkEditSpectators(spectators);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};

export const deleteSpectator = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const spectatorId = parseInt(req.params.spectatorId);
		if (!spectatorId || isNaN(spectatorId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		await SpectatorService.deleteSpectator(spectatorId);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
