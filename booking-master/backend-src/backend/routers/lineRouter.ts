import { middleware } from '@line/bot-sdk';
import { NextFunction, Request, Response, Router } from 'express';

import { RESPONSE_SUCCESS, lineConfig } from '../config';
import { LineController } from '../controllers';

const router = Router();

router.post(
	'/',
	middleware({
		channelSecret: lineConfig.LINE_CHANNEL_SECRET,
		channelAccessToken: lineConfig.LINE_CHANNEL_ACCESS_TOKEN,
	}),
	(req: Request, res: Response, next: NextFunction) => {
		Promise.all(req.body.events.map(LineController.handleEvent))
			.then(() => res.sendStatus(RESPONSE_SUCCESS))
			.catch((e) => next(e));
	},
);

export { router };
