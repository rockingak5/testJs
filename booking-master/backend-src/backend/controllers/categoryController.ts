import path = require('path');
import { NextFunction, Request, Response, Router } from 'express';
import moment = require('moment');
import { CreationAttributes, Op, Transaction, UniqueConstraintError, WhereAttributeHash } from 'sequelize';
import { CONFLICT_ERROR, RESPONSE_SUCCESS, systemConfig, SYSTEM_ERROR, BAD_REQUEST } from '../config';
import { AppError, FileOps } from '../utilities';
import { db } from '../models';
import { CategoryDetail } from '../models/categoryDetailModel';
import { CategoryTag } from '../models/categoryTagModel';
import { CategoryArea } from '../models/categoryAreaModel';
import { CategoryService, OccasionService, SocketServerService, categoryMessageDetailService } from '../services';
import { CategoryMessage } from '../models/categoryMessageModel';
import { CategoryMessageDetail } from '../models/categoryMessageDetail';
import { batchUpdateDisplayCategoriesSchema } from '../schemas/category';
import { isEmpty } from 'lodash';

export const statsToday = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const from = req.query.from;
		const to = req.query.to;
		const dateMin = from
			? moment(from as string)
					.startOf('day')
					.toDate()
			: moment().startOf('day').toDate();
		const dateMax = to
			? moment(to as string)
					.endOf('day')
					.toDate()
			: moment().endOf('day').toDate();
		const occurrenceWhere = { startAt: { [Op.between]: [dateMin, dateMax] } };
		const stats = await CategoryService.statsOfTheDay(occurrenceWhere);
		res.send(stats);
	} catch (e) {
		next(e);
	}
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const reqFiles = req.files as { categoryImages?: Express.Multer.File[] };
	const images = reqFiles?.categoryImages ?? [];

	try {
		const params = req.body;

		if (!params.title) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const areas = params.categoryAreas
			? (JSON.parse(params.categoryAreas as string) as CreationAttributes<CategoryArea>[])
			: [];
		const details = params.categoryDetails
			? (JSON.parse(params.categoryDetails as string) as CreationAttributes<CategoryDetail>[])
			: [];
		const messages = params.categoryMessages
			? (JSON.parse(params.categoryMessages as string) as CreationAttributes<CategoryMessage>[])
			: [];
		const imageDetails = params.categoryImagesData
			? (JSON.parse(params.categoryImagesData as string) as imageUpdateType[])
			: [];
		const tags = params.categoryTags
			? (JSON.parse(params.categoryTags as string) as CreationAttributes<CategoryTag>[])
			: [];
		const categoryMessageDetail = params.categoryMessageDetail
			? (JSON.parse(params.categoryMessageDetail as string) as CreationAttributes<CategoryMessageDetail>)
			: {};
		transaction = await db.sequelize.transaction();
		const category = await CategoryService.createCategory(params, transaction);

		const startDate = moment(category?.startDate).format('YYYY-MM-DD');
		const endDate = moment(category?.endDate).format('YYYY-MM-DD');
		let dataCreateOccurrences;
		if (category?.isSettingTime) {
			dataCreateOccurrences = Array.from(new Array(moment(endDate).diff(moment(startDate), 'days') + 1)).map(
				(item, i) => ({
					maxAttendee: category?.numberOfPeople,
					startAt: category?.startDate,
					occurrenceId: null,
					endAt: category?.endDate,
					categoryId: category?.categoryId,
					startDate: moment(category?.startDate).add(i, 'days'),
					isDisplayed: category.isDisplayed,
					isSettingTime: category.isSettingTime,
					deletedAt: null,
				}),
			);
		}

		await Promise.all([
			Array.isArray(areas) && areas.length > 0
				? CategoryService.updateCategoryAreas(category.categoryId, areas, transaction)
				: Promise.resolve(),
			Array.isArray(details) &&
				details.length > 0 &&
				CategoryService.updateCategoryDetails(category.categoryId, details, transaction),
			Array.isArray(messages) && messages.length > 0
				? CategoryService.updateCategoryMessages(category.categoryId, messages, transaction)
				: Promise.resolve(),
			Array.isArray(tags) && tags.length > 0
				? CategoryService.updateCategoryTags(category.categoryId, tags, transaction)
				: Promise.resolve(),
			Array.isArray(images) && images.length > 0 && Array.isArray(imageDetails) && imageDetails.length > 0
				? CategoryService.updateCategoryImages(category.categoryId, images, imageDetails, transaction)
				: Promise.resolve(),
			category?.isSettingTime &&
				db.occurrences.bulkCreate(dataCreateOccurrences as any, {
					transaction,
				}),
		]);

		if (params?.isMessage && !isEmpty(categoryMessageDetail)) {
			await categoryMessageDetailService.createCategoryMessageDetails(
				{ categoryId: category?.categoryId, ...categoryMessageDetail },
				transaction,
			);
		}

		await transaction.commit();
		SocketServerService.emitCategory({ categoryId: category.categoryId });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (Array.isArray(images)) {
			await Promise.all(
				images.map((image) => FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_CATEGORY, image.filename))),
			);
		}
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const browseCategories = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const condition: paginationParams = {
			pp: parseInt(req.query.pp as string) || 20,
			p: parseInt(req.query.p as string) || 1,
			sort: (req.query.sort as string as 'asc' | 'desc' | null) || 'asc',
			sortKey: (req.query.sortKey as string) || 'showOrder',
		};
		const categoryWhere: WhereAttributeHash = {};
		if (req.query.title) {
			categoryWhere.title = { [Op.substring]: req.query.title };
		}
		const categoryRowCount = await CategoryService.browseCategories(condition, categoryWhere);
		res.send({ ...condition, ...categoryRowCount });
	} catch (e) {
		next(e);
	}
};

export const listCategoriesBare = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const include: WhereAttributeHash | undefined =
			req.query.includePic == 'true'
				? {
						separate: true,
						association: db.categories.associations.categoryImages,
						attributes: ['picUrl', 'showOrder'],
						order: [['showOrder', 'asc']],
				  }
				: undefined;
		const isParanoid = req.query.includeDestroyed == 'true' ? false : true;
		const categoriesBare = await CategoryService.listCategoriesBare(include, isParanoid);
		res.send(categoriesBare);
	} catch (e) {
		next(e);
	}
};

export const listCategoriesTags = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const tags = await CategoryService.listCategoriesTags();
		res.send(tags);
	} catch (e) {
		next(e);
	}
};

export const listCategoriesAreas = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const areas = await CategoryService.listCategoriesAreas();
		res.send(areas);
	} catch (e) {
		next(e);
	}
};

export const getCategoryDetailed = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const categoryId = parseInt(req.params.categoryId);
		const search = req.query.search;

		if (!categoryId || isNaN(categoryId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid category id');
		}
		const from = req.query.from ? moment(req.query.from as string) : moment().startOf('month').toDate();
		const to = req.query.to ? moment(req.query.to as string) : moment().endOf('month').toDate();

		const occurrenceWhere = { startAt: { [Op.between]: [from, to] } };

		const isParanoid = req.query.includeDestroyed == 'true' ? false : true;
		const category = await CategoryService.detailCategory_Master({
			categoryId,
			isParanoid,
			occurrenceWhere,
			search,
		});
		res.send(category);
	} catch (e) {
		next(e);
	}
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
	const categoryId = parseInt(req.params.categoryId);
	const params = req.body;
	const reqFiles = req.files as { categoryImages?: Express.Multer.File[] };
	const images = reqFiles?.categoryImages ?? [];
	const areas = params.categoryAreas
		? (JSON.parse(params.categoryAreas as string) as CreationAttributes<CategoryArea>[])
		: [];
	const details = params.categoryDetails
		? (JSON.parse(params.categoryDetails as string) as CreationAttributes<CategoryDetail>[])
		: [];
	const messages = params.categoryMessages
		? (JSON.parse(params.categoryMessages as string) as CreationAttributes<CategoryMessage>[])
		: [];
	const imageDetails = params.categoryImagesData
		? (JSON.parse(params.categoryImagesData as string) as imageUpdateType[])
		: [];
	const tags = params.categoryTags
		? (JSON.parse(params.categoryTags as string) as CreationAttributes<CategoryTag>[])
		: [];
	const categoryMessageDetail = params.categoryMessageDetail
		? (JSON.parse(params.categoryMessageDetail as string) as CreationAttributes<CategoryMessageDetail>)
		: {};

	let transaction: Transaction | null = null;

	try {
		if (!categoryId) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}

		transaction = await db.sequelize.transaction();
		const [categoryUpdate] = await Promise.all([
			CategoryService.updateCategory(categoryId, params, transaction),
			Array.isArray(areas) ? CategoryService.updateCategoryAreas(categoryId, areas, transaction) : Promise.resolve(),
			Array.isArray(details)
				? CategoryService.updateCategoryDetails(categoryId, details, transaction)
				: Promise.resolve(),
			Array.isArray(messages) && messages.length > 0
				? CategoryService.updateCategoryMessages(categoryId, messages, transaction)
				: Promise.resolve(),
			Array.isArray(tags) ? CategoryService.updateCategoryTags(categoryId, tags, transaction) : Promise.resolve(),
			Array.isArray(images) && Array.isArray(imageDetails)
				? CategoryService.updateCategoryImages(categoryId, images, imageDetails, transaction)
				: Promise.resolve(),
		]);

		if (params?.isMessage && !isEmpty(categoryMessageDetail)) {
			const currentCategoryMessageDetail = await categoryMessageDetailService.getCategoryMessageDetail(
				{ categoryId },
				transaction,
			);
			if (currentCategoryMessageDetail) {
				await categoryMessageDetailService.updateCategoryMessageDetails(
					{ categoryId },
					{ ...categoryMessageDetail },
					transaction,
				);
			} else {
				await categoryMessageDetailService.createCategoryMessageDetails(
					{ categoryId, ...categoryMessageDetail },
					transaction,
				);
			}
		}

		await transaction?.commit();
		SocketServerService.emitCategory({ categoryId });
		SocketServerService.emitRegistration({
			memberId: (categoryUpdate as any).memberId as number,
			occasionId: null,
		});
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (Array.isArray(images)) {
			await Promise.all(
				images.map((image) => FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_CATEGORY, image.filename))),
			);
		}
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const updateCategoryOrder = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const params = req.body.categories as { categoryId: number; showOrder: number }[];
		if (!Array.isArray(params) || params.length == 0) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		await CategoryService.updateCategoryOrder(params, transaction);
		await transaction.commit();
		SocketServerService.emitCategory({});
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
	const categoryId = parseInt(req.params.categoryId);
	if (!categoryId) {
		return res.status(SYSTEM_ERROR).send('invalid category id');
	}
	let transaction: Transaction | null = null;
	try {
		transaction = await db.sequelize.transaction();
		await Promise.all([
			CategoryService.deleteCategory(categoryId, transaction),
			OccasionService.deleteOccasionByCategoryId(categoryId, transaction),
		]);
		await transaction.commit();
		SocketServerService.emitCategory({});
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		if (e instanceof UniqueConstraintError) {
			res.sendStatus(CONFLICT_ERROR);
		} else {
			next(e);
		}
	}
};

export const batchUpdateCategories = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();

	try {
		const parsed = batchUpdateDisplayCategoriesSchema.safeParse(req.body);

		if (!parsed.success) {
			throw new AppError(BAD_REQUEST, 'invalid parameters');
		}

		await CategoryService.batchUpdateCategoriesHandler(parsed.data, transaction);

		await transaction.commit();

		res.status(RESPONSE_SUCCESS).send('OK');
	} catch (error) {
		await transaction.rollback();
		next(error);
	}
};
