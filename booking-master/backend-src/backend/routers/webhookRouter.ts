import { Router, Request, Response, NextFunction } from 'express';
import * as paymentController from '../controllers/payments.controller';
import { middleware } from '@line/bot-sdk';
import lineConfig from '../config/lineConfig';
import { RESPONSE_SUCCESS } from '../config/constants';
import { LineController } from '~controllers';

export const router = Router();

router.post('/veritrans/occurrences', paymentController.webhookVeritrans);

router.post(
	'/line/messages',
	middleware({
		channelSecret: lineConfig.LINE_CHANNEL_SECRET,
		channelAccessToken: lineConfig.LINE_CHANNEL_ACCESS_TOKEN,
	}),
	(req: Request, res: Response, next: NextFunction) => {
		console.log('routers.webhookRouter body', req.body);
		Promise.all(req.body.events.map(LineController.handleEvent))
			.then(() => res.sendStatus(RESPONSE_SUCCESS))
			.catch((e) => {
				console.log('routers.webhookRouter Error', e);
				next(e);
			});
	},
);
