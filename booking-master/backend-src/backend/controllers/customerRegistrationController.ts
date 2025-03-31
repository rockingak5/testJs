import { NextFunction, Request, Response } from 'express';
import { Transaction, WhereOptions } from 'sequelize';
import { CustomerRegistration } from '~models/customerRegistrationModel';

import { RESPONSE_SUCCESS, SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { SettingService, SocketServerService } from '../services';
import { AppError } from '../utilities';

export const createCustomerRegistration = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const choices = req.body.choices as { contents: string; showOrder: number }[];
		const { required, label, type, isDisplayed, isAdminDisplayed } = req.body;
		if (!(label && type)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}
		transaction = await db.sequelize.transaction();
		await SettingService.createCustomerRegistration({
			required,
			label,
			type,
			isDisplayed,
			isAdminDisplayed,
			choices,
			transaction,
		});

		await transaction.commit();
		SocketServerService.emitCustomerRegistrationsChanged();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};
export const updateCustomerRegistrationOrder = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const params = req.body.customerRegistrations as { customerRegistrationId: number; showOrder: number }[];
		if (!Array.isArray(params) || params.length == 0) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		await SettingService.updateCustomerRegistrationOrder(params, transaction);
		await transaction.commit();
		SocketServerService.emitCustomerRegistrationsChanged();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const updateCustomerRegistration = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;

	try {
		const { required, label, type, isDisplayed, isAdminDisplayed } = req.body;

		const choices = req.body.choices as { contents: string; showOrder: number; type: string }[];

		const customerRegistrationId = parseInt(req.params.customerRegistrationId);
		if (!customerRegistrationId || isNaN(customerRegistrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid customer registrationId id', false);
		}
		if (!(label && type)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}

		transaction = await db.sequelize.transaction();
		await SettingService.updateCustomerRegistration({
			customerRegistrationId,
			required,
			label,
			isDisplayed,
			isAdminDisplayed,
			choices,
			transaction,
		});
		await transaction.commit();
		SocketServerService.emitCustomerRegistrationsChanged();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const listCustomerRegistrations = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const query: WhereOptions<CustomerRegistration> = {
			...(req.query.isDisplayed ? { isDisplayed: JSON.parse(req.query.isDisplayed as string) } : {}),
			...(req.query.isDefault ? { isDefault: JSON.parse(req.query.isDefault as string) } : {}),
			...(req.query.isAdminDisplayed ? { isAdminDisplayed: JSON.parse(req.query.isAdminDisplayed as string) } : {}),
		};

		const customerRegistrations = await SettingService.listCustomerRegistrations(query);
		res.send(customerRegistrations || []);
	} catch (e) {
		console.log(e);
		next(e);
	}
};

export const deleteCustomerRegistration = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;

	try {
		const customerRegistrationId = parseInt(req.params.customerRegistrationId);
		if (
			!customerRegistrationId ||
			isNaN(customerRegistrationId) ||
			customerRegistrationId === 1 ||
			customerRegistrationId === 2
		) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		const customerRegistration = await db.customerRegistrations.findByPk(customerRegistrationId);
		if (!customerRegistration?.isDelete) {
			throw new AppError(SYSTEM_ERROR, 'can not delete', false);
		}
		await SettingService.deleteCustomerRegistration(customerRegistrationId, transaction);
		await transaction.commit();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

// export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
// 	let transaction: Transaction | null = null
// 	try {
// 		const questionId = parseInt(req.params.questionId)
// 		if (!questionId || isNaN(questionId)) {
// 			throw new AppError(SYSTEM_ERROR, 'invalid question id', false)
// 		}
// 		const choices = req.body.choices as { contents: string; showOrder: number }[] | undefined
// 		const { contents } = req.body
// 		if (
// 			!(
// 				contents &&
// 				choices &&
// 				Array.isArray(choices) &&
// 				choices.length &&
// 				choices.every((c) => c.contents != undefined)
// 			)
// 		) {
// 			throw new AppError(SYSTEM_ERROR, 'invalid parameters')
// 		}
// 		transaction = await db.sequelize.transaction()
// 		await SettingService.updateQuestion(questionId, contents, choices, transaction)
// 		await transaction.commit()
// 		res.sendStatus(RESPONSE_SUCCESS)
// 	} catch (e) {
// 		if (transaction != null) {
// 			await transaction.rollback()
// 		}
// 		next(e)
// 	}
// }

// export const updateQuestionOrder = async (req: Request, res: Response, next: NextFunction) => {
// 	let transaction: Transaction | null = null
// 	try {
// 		const params = req.body.questions as { campaignQuestionId: number; showOrder: number }[]
// 		if (!Array.isArray(params) || params.length == 0) {
// 			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false)
// 		}
// 		transaction = await db.sequelize.transaction()
// 		await SettingService.updateQuestionOrder(params, transaction)
// 		await transaction.commit()
// 		res.sendStatus(RESPONSE_SUCCESS)
// 	} catch (e) {
// 		if (transaction != null) {
// 			await transaction.rollback()
// 		}
// 		next(e)
// 	}
// }

// export const deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
// 	let transaction: Transaction | null = null
// 	try {
// 		const questionId = parseInt(req.params.questionId)
// 		if (!questionId || isNaN(questionId)) {
// 			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false)
// 		}
// 		transaction = await db.sequelize.transaction()
// 		await SettingService.deleteQuestion(questionId, transaction)
// 		await transaction.commit()
// 		res.sendStatus(RESPONSE_SUCCESS)
// 	} catch (e) {
// 		if (transaction != null) {
// 			await transaction.rollback()
// 		}
// 		next(e)
// 	}
// }
