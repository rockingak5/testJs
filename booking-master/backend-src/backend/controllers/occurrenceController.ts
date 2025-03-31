import { NextFunction, Request, Response } from 'express';
import { Op, Transaction, WhereAttributeHash } from 'sequelize';
import { PAYMENT_STATUS, PAYMENT_TYPE, RESPONSE_SUCCESS, SYSTEM_ERROR } from '../config';
import { AppError } from '../utilities';
import { db } from '../models';
import { OccurrenceService, SocketServerService, paymentsService } from '../services';

export const getOccurrenceDetailed_Master = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const occurrenceId = parseInt(req.params.occurrenceId);
		if (!occurrenceId) {
			throw new AppError(SYSTEM_ERROR, 'invalid occurrenceId', false);
		}
		await OccurrenceService.occurrenceDetail(occurrenceId).then((occurrence) => res.send(occurrence));
	} catch (e) {
		next(e);
	}
};

export const editOccurrences = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const occasionId = parseInt(req.body.occasionId);
	const categoryId = parseInt(req.body.categoryId);
	const occurrenceData: {
		maxAttendee: number;
		startAt: string;
		endAt: string;
		remarks: string | null;
		isDisplayed: true;
	}[] = req.body.occurrences;
	try {
		if (!categoryId || !occurrenceData.length) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		const socketData = await OccurrenceService.editOccurrences(
			isNaN(categoryId) ? null : categoryId,
			isNaN(occasionId) ? null : occasionId,
			occurrenceData.map((o) => ({
				...o,
				isDisplayed: true,
			})),
			transaction,
		);
		await transaction.commit().then(() => {
			SocketServerService.emitOccurrence(socketData);
			res.sendStatus(RESPONSE_SUCCESS);
		});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const updateOccurrence = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const occurrenceId = parseInt(req.params.occurrenceId);
	try {
		if (!occurrenceId) {
			throw new AppError(SYSTEM_ERROR, 'invalid occurrenceId', false);
		}
		const params = req.body as { maxAttendee: number; isDisplayed: boolean; remarks?: string };
		transaction = await db.sequelize.transaction();
		const occurrence = await OccurrenceService.updateOccurrence({ occurrenceId, params }, transaction);
		await transaction.commit().then(() => {
			SocketServerService.emitOccurrence({
				categoryId: occurrence.categoryId,
				occasionId: occurrence.occasionId,
				occurrenceId: occurrence.occurrenceId,
			});
			res.sendStatus(RESPONSE_SUCCESS);
		});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const deleteOccurrence = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const occurrenceId = parseInt(req.params.occurrenceId);
	try {
		if (!occurrenceId) {
			throw new AppError(SYSTEM_ERROR, 'invalid occurrenceId', false);
		}
		transaction = await db.sequelize.transaction();
		const socketData = await OccurrenceService.deleteOccurrence(occurrenceId, transaction);
		await transaction.commit().then(() => {
			SocketServerService.emitOccurrence(socketData);
			res.sendStatus(RESPONSE_SUCCESS);
		});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const bulkDeleteOccurrences = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const occasionId = parseInt(req.body.occasionId);
		const categoryId = parseInt(req.body.categoryId);
		const { from, to, isConfirmed } = req.body;
		if (!(from && to)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		if (!categoryId || isNaN(categoryId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		const occurrenceWhere: WhereAttributeHash = {
			categoryId,
			startDate: { [Op.between]: [from, to] },
		};
		if (occasionId && !isNaN(occasionId)) {
			occurrenceWhere.occasionId = occasionId;
		}
		if (isConfirmed === true || isConfirmed == 'true') {
			await OccurrenceService.bulkDeleteOccurrences(occurrenceWhere, transaction);
			await transaction.commit();
			SocketServerService.emitOccurrence({ occasionId, categoryId });
			res.sendStatus(RESPONSE_SUCCESS);
		} else {
			const occurrenceCount = await OccurrenceService.countOccurrencesToBeDeleted(occurrenceWhere, transaction);
			await transaction.commit();
			res.send({ count: occurrenceCount });
		}
		// let socketData = await OccurrenceService.deleteOccurrence(occurrenceId, transaction);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const purchase = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const lineId = res.locals.memberLine.userId;
		const { occurrenceId } = req.params;

		const member = await db.members.findOne({
			raw: false,
			where: {
				lineId,
			},
		});

		if (!member) {
			return res.status(400).json({ message: 'メンバーが見つかりません' }).end();
		}

		const occurrence = await db.occurrences.findOne({
			where: {
				occurrenceId,
			},
			attributes: [],
			include: [
				{
					model: db.categories,
					attributes: ['fee'],
				},
				{
					model: db.occasions,
					attributes: ['fee'],
				},
			],
		});

		if (!occurrence) {
			return res.status(400).json({ message: 'カテゴリーが見つかりません' }).end();
		}

		const fee = parseFloat(`${occurrence?.Occasion?.fee || occurrence?.Category?.fee}`);

		const transaction = await db.transaction.findOne({
			where: {
				memberId: member.memberId,
				occurrenceId: +occurrenceId,
			},
			order: [['updatedAt', 'DESC']],
		});

		if (
			(transaction && transaction.type === PAYMENT_TYPE.PURCHASE && transaction.status === PAYMENT_STATUS.FULFILLED) ||
			fee === 0
		) {
			return res.status(200).json({ purchased: true, paymentKey: null }).end();
		}

		const paymentKeyResult = await paymentsService.getPopPaymentKey({
			amount: fee,
			memberId: member.memberId,
			occurrenceId: +occurrenceId,
		});

		res.status(200).json({ purchased: false, paymentKey: paymentKeyResult.paymentKey }).end();
	} catch (error) {
		next(error);
	}
};
