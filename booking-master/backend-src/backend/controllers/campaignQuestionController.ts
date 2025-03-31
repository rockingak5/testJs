import { Request, Response, NextFunction } from 'express';
import { Transaction } from 'sequelize';
import { RESPONSE_SUCCESS, SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { CampaignService } from '../services';
import { AppError } from '../utilities';
export const createQuestion = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const choices = req.body.choices as { contents: string; showOrder: number }[];
		const { contents, required } = req.body;
		if (
			!(
				contents &&
				choices &&
				Array.isArray(choices) &&
				choices.length &&
				choices.every((c) => c.contents != undefined)
			)
		) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}
		transaction = await db.sequelize.transaction();
		await CampaignService.createQuestion({ contents, required, choices, transaction });
		await transaction.commit();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const listCampaignQuestions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const campaignId = parseInt(req.params?.campaignId);
		if (!campaignId || isNaN(campaignId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid question id', false);
		}
		const questions = await CampaignService.listCampaignQuestions(campaignId);
		res.send(questions);
	} catch (e) {
		console.log(e);

		next(e);
	}
};
export const createQuestionCampaign = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const choices = req.body.choices as { contents: string; showOrder: number }[];
		const { contents, campaignId, type, required } = req.body;
		if (
			!(
				type &&
				contents &&
				(type === 'checkbox'
					? choices && Array.isArray(choices) && choices.length && choices.every((c) => c.contents != undefined)
					: true)
			)
		) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}
		transaction = await db.sequelize.transaction();
		await CampaignService.createQuestionCampaign({ campaignId, contents, type, required, choices, transaction });
		await transaction.commit();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		console.log(e);

		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const listQuestions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const questions = await CampaignService.listQuestions();
		res.send(questions);
	} catch (e) {
		next(e);
	}
};

export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const questionId = parseInt(req.params.questionId);
		if (!questionId || isNaN(questionId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid question id', false);
		}
		const choices = req.body.choices as { contents: string; showOrder: number }[] | undefined;
		const { contents, type } = req.body;
		if (
			!(
				contents &&
				(type === 'checkbox'
					? choices && Array.isArray(choices) && choices.length && choices.every((c) => c.contents != undefined)
					: true)
			)
		) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}
		transaction = await db.sequelize.transaction();
		await CampaignService.updateQuestion(questionId, contents, choices || [], transaction);
		await transaction.commit();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const updateQuestionOrder = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const params = req.body.questions as { campaignQuestionId: number; showOrder: number }[];
		if (!Array.isArray(params) || params.length == 0) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		await CampaignService.updateQuestionOrder(params, transaction);
		await transaction.commit();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const questionId = parseInt(req.params.questionId);
		if (!questionId || isNaN(questionId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		await CampaignService.deleteQuestion(questionId, transaction);
		await transaction.commit();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};
