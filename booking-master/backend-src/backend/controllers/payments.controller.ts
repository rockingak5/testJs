import type { NextFunction, Request, Response } from 'express';
import { db } from '../models';
import { checkSignature } from '../utilities/paymentUtil';
import { PAYMENT_STATUS } from '../config';

export const webhookVeritrans = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = req.body;

		const isVerified = checkSignature(req.body);

		if (isVerified && data.status === 'success') {
			const transaction = await db.transaction.findOne({
				where: {
					orderId: data.order_id,
					type: 'purchase',
				},
			});

			if (transaction) {
				await transaction.update({
					status: PAYMENT_STATUS.FULFILLED,
				});
			}
		}

		res.status(201).send({
			success: true,
		});
	} catch (error) {
		next(error);
	}
};
