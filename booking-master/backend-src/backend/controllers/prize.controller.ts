import {} from '~models';
import { prizesService } from '~services';

import type { Request, Response, NextFunction } from 'express';

export const browsePrizes = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const prizes = await prizesService.browsePrizes();
		res.status(200).json(prizes);
	} catch (e) {
		next(e);
	}
};
