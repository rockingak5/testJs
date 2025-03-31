import { NextFunction, Request, Response } from 'express';

import { BAD_REQUEST, CREATED, RESPONSE_SUCCESS } from '../config';
import { db } from '../models';
import { browseRichMenuQuerySchema, createRichMenuSchema, updateRichMenuSchema } from '../schemas/richmenu';
import { RichmenuService } from '../services';
import { AppError } from '../utilities';

export const createRichMenu = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();

	try {
		const areas = JSON.parse(req.body.areas);

		const size = JSON.parse(req.body.size);

		const validatedBody = createRichMenuSchema.safeParse(
			Object.assign({}, req.body, {
				image: req.file,
				areas,
				size,
			}),
		);

		if (!validatedBody.success) {
			throw new AppError(BAD_REQUEST, 'invalid parameters', false);
		}

		await RichmenuService.createRichMenuHandler(validatedBody.data, transaction);
		await transaction.commit();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		await transaction.rollback();
		next(e);
	}
};

export const browseListRichMenu = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const parsed = browseRichMenuQuerySchema.safeParse({
			...req.query,
			...(req.query.isDisplayed ? { isDisplayed: JSON.parse(req.query.isDisplayed as string) } : {}),
		});

		if (!parsed.success) {
			throw new AppError(BAD_REQUEST, 'invalid parameters');
		}

		const data = await RichmenuService.browseListRichMenuHandler(parsed.data);

		res.status(RESPONSE_SUCCESS).json(data);
	} catch (error) {
		next(error);
	}
};

export const deleteRichMenu = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();

	try {
		const id = req.params.richMenuId;

		if (!id) {
			throw new AppError(BAD_REQUEST, 'invalid parameters');
		}

		await RichmenuService.deleteRichMenuHandler(id, transaction);

		await transaction.commit();

		res.status(RESPONSE_SUCCESS).send('OK');
	} catch (error) {
		await transaction.rollback();
		next(error);
	}
};

export const updateRichMenu = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();
	const file = req.file;

	try {
		const id = req.params.richMenuId;

		const data = {
			...req.body,
			...(req.body.size ? { size: JSON.parse(req.body.size) } : {}),
			...(req.body.areas ? { areas: JSON.parse(req.body.areas) } : {}),
			...(file ? { image: file } : {}),
		};

		const parsed = await updateRichMenuSchema.safeParseAsync(data);

		if (!id || !parsed.success) {
			throw new AppError(BAD_REQUEST, 'invalid parameters');
		}

		await RichmenuService.updateRichMenuHandler(Number(id), parsed.data, transaction);

		await transaction.commit();

		res.status(RESPONSE_SUCCESS).send('OK');
	} catch (error) {
		await transaction.rollback();
		next(error);
	}
};

export const publishRichMenu = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();

	const id = req.params.richMenuId;

	if (!id) {
		throw new AppError(BAD_REQUEST, 'invalid parameters');
	}

	try {
		const richMenuPublished = await RichmenuService.publishRichMenuHandler(Number(id), transaction);
		await transaction.commit();
		res.status(CREATED).json(richMenuPublished);
	} catch (error) {
		await transaction.rollback();
		next(error);
	}
};

export const unpublishRichMenu = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();

	const id = req.params.richMenuId;

	if (!id) {
		throw new AppError(BAD_REQUEST, 'invalid parameters');
	}

	try {
		const richMenuUnpublished = await RichmenuService.unpublishRichMenuHandler(Number(id), transaction);
		res.status(RESPONSE_SUCCESS).json(richMenuUnpublished);
		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		next(error);
	}
};
