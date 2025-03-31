import { Request, Response, NextFunction } from 'express';
import { Transaction } from 'sequelize';
import { RESPONSE_SUCCESS, SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { ChatService, SocketServerService } from '../services';
import { AppError } from '../utilities';

export const getChat = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const memberId = parseInt(req.params.memberId);
		if (!memberId) {
			throw new AppError(SYSTEM_ERROR, 'invalid memberId', false);
		}
		const [isUpdated, chats] = await ChatService.getChat(memberId);
		if (isUpdated) {
			SocketServerService.emitChatSeen({ memberId });
			SocketServerService.emitMember({ memberId });
		}
		res.send(chats);
	} catch (e) {
		next(e);
	}
};

export const replyChat = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const memberId = parseInt(req.params.memberId);
		const contents = req.body.contents;
		if (!memberId) {
			throw new AppError(SYSTEM_ERROR, 'invalid memberId', false);
		} else if (!contents) {
			throw new AppError(SYSTEM_ERROR, 'empty contents', false);
		}
		transaction = await db.sequelize.transaction();
		await ChatService.replyChat(memberId, contents, transaction);
		await transaction.commit();
		SocketServerService.emitChat({ memberId: memberId });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};
