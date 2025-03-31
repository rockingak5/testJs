import { Request, Response, NextFunction } from 'express';
import moment = require('moment');
import path = require('path');
import { CreationAttributes, Op, Transaction } from 'sequelize';
import { RESPONSE_SUCCESS, systemConfig, SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { OccasionDetail } from '../models/occasionDetailModel';
import { Occurrence } from '../models/occurrenceModel';
import { OccasionService, SocketServerService } from '../services';
import { AppError, FileOps } from '../utilities';
import { CategoryMessageDetail } from '../models/categoryMessageDetail';

export const listOccasionBare = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const include =
			req.query.includePic == 'true' ? { association: db.occasions.associations.occasionImages } : undefined;
		const isParanoid = req.query.includeDestroyed == 'true' ? false : true;
		const isCampaign = req.query.isCampaign == 'true' ? true : false;
		await OccasionService.listOccasionsBare(include, isParanoid, isCampaign).then((occasionList) =>
			res.send(occasionList),
		);
	} catch (e) {
		next(e);
	}
};

export const detailOccasion_Master = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const occasionId = parseInt(req.params.occasionId);
		const search = req.query.search;

		if (!occasionId || isNaN(occasionId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid occasionId', false);
		}
		const from = req.query.from ? moment(req.query.from as string) : moment().startOf('month').toDate();
		const to = req.query.to ? moment(req.query.to as string) : moment().endOf('month').toDate();
		const occurrenceWhere = { startAt: { [Op.between]: [from, to] } };
		const isParanoid = req.query.includeDestroyed == 'true' ? false : true;
		await OccasionService.detailOccasion_Master({ occasionId, isParanoid, occurrenceWhere, search }).then((occasion) =>
			res.send(occasion),
		);
	} catch (e) {
		next(e);
	}
};

export const browseOccasion_Master = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const categoryId = parseInt(req.query.categoryId as string);
		if (!categoryId || isNaN(categoryId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const condition: paginationParams = {
			pp: parseInt(req.query.pp as string) || 20,
			p: parseInt(req.query.p as string) || 1,
			sort: (req.query.sort as string as 'asc' | 'desc' | null) || 'asc',
			sortKey: (req.query.sortKey as string) || 'showOrder',
		};
		await OccasionService.browseOccasions_Master(categoryId, condition).then((occasions) =>
			res.send({ ...condition, ...occasions }),
		);
		//res.send({ pp: condition.pp, p: condition.p, sort: condition.sort, sortKey: condition.sortKey, ...occasions }));
	} catch (e) {
		next(e);
	}
};

export const browseOccasionMaster = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const campaignId = parseInt(req.query.campaignId as string);
		if (!campaignId || isNaN(campaignId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const condition: paginationParams = {
			pp: parseInt(req.query.pp as string) || 20,
			p: parseInt(req.query.p as string) || 1,
			sort: (req.query.sort as string as 'asc' | 'desc' | null) || 'asc',
			sortKey: (req.query.sortKey as string) || 'showOrder',
		};
		await OccasionService.browseOccasionsMaster(campaignId, condition).then((occasions) =>
			res.send({ ...condition, ...occasions }),
		);
		//res.send({ pp: condition.pp, p: condition.p, sort: condition.sort, sortKey: condition.sortKey, ...occasions }));
	} catch (e) {
		next(e);
	}
};

export const createCampaignOccasion = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const reqFiles = req.files as { occasionImages?: Express.Multer.File[] };
	const images = reqFiles?.occasionImages ?? [];

	try {
		const params = req.body;

		if (!params.title || isNaN(params.campaignId) || !params.campaignId) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const details = params.occasionDetails
			? (JSON.parse(params.occasionDetails as string) as CreationAttributes<OccasionDetail>[])
			: [];
		const imageDetails = params.occasionImagesData
			? (JSON.parse(params.occasionImagesData as string) as imageUpdateType[])
			: [];
		params.canOverlap = params.canOverlap && params.canOverlap == 'true';

		params.campaignId = parseInt(params.campaignId);
		transaction = await db.sequelize.transaction();
		const occasion = await OccasionService.createCampaignOccasion(params, transaction);

		await Promise.all([
			Array.isArray(details) && details.length > 0
				? OccasionService.updateOccasionDetails(occasion.occasionId, details, transaction)
				: Promise.resolve(),
			Array.isArray(images) && images.length > 0 && Array.isArray(imageDetails) && imageDetails.length > 0
				? OccasionService.updateOccasionImages(occasion.occasionId, images, imageDetails, transaction)
				: Promise.resolve(),
		])
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitOccasion({
					occasionId: occasion.occasionId,
					campaignId: occasion.campaignId as number | undefined,
				});
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		if (Array.isArray(images)) {
			await Promise.all(
				images.map((image) => FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_OCCASION, image.filename))),
			);
		}
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const createOccasion = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const reqFiles = req.files as { occasionImages?: Express.Multer.File[] };
	const images = reqFiles?.occasionImages ?? [];

	try {
		const params = req.body;

		if (!params.title || isNaN(params.categoryId) || !params.categoryId) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const details = params.occasionDetails
			? (JSON.parse(params.occasionDetails as string) as CreationAttributes<OccasionDetail>[])
			: [];
		const imageDetails = params.occasionImagesData
			? (JSON.parse(params.occasionImagesData as string) as imageUpdateType[])
			: [];
		const categoryMessageDetail = params.categoryMessageDetail
			? (JSON.parse(params.categoryMessageDetail as string) as CreationAttributes<CategoryMessageDetail>)
			: {};
		params.canOverlap = params.canOverlap && params.canOverlap == 'true';

		params.categoryId = parseInt(params.categoryId);
		transaction = await db.sequelize.transaction();
		const occasion = await OccasionService.createOccasion(params, transaction);

		const startDate = moment(occasion?.startDate).format('YYYY-MM-DD');
		const endDate = moment(occasion?.endDate).format('YYYY-MM-DD');
		let dataCreateOccurrences;

		if (occasion?.isSettingTime) {
			dataCreateOccurrences = Array.from(new Array(moment(endDate).diff(moment(startDate), 'days') + 1)).map(
				(item, i) => ({
					maxAttendee: occasion?.numberOfPeople,
					startAt: moment(occasion?.startDate).add(i, 'days'),
					occurrenceId: null,
					categoryId: params?.categoryId,
					endAt: occasion?.endDate,
					occasionId: occasion?.occasionId,
					startDate: moment(occasion?.startDate).add(i, 'days'),
					isDisplayed: occasion.isDisplayed,
					isSettingTime: occasion.isSettingTime,
					deletedAt: null,
				}),
			);
		}

		await Promise.all([
			Array.isArray(details) && details.length > 0
				? OccasionService.updateOccasionDetails(occasion.occasionId, details, transaction)
				: Promise.resolve(),
			Array.isArray(images) && images.length > 0 && Array.isArray(imageDetails) && imageDetails.length > 0
				? OccasionService.updateOccasionImages(occasion.occasionId, images, imageDetails, transaction)
				: Promise.resolve(),
			occasion?.isSettingTime &&
				db.occurrences.bulkCreate(dataCreateOccurrences as any, {
					transaction,
				}),
			occasion?.isMessage &&
				db.categoryMessageDetails.create({ occasionId: occasion?.occasionId, ...categoryMessageDetail } as any, {
					transaction,
				}),
		])
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitOccasion({
					occasionId: occasion.occasionId,
					categoryId: occasion.categoryId as number | undefined,
				});
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		if (Array.isArray(images)) {
			await Promise.all(
				images.map((image) => FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_OCCASION, image.filename))),
			);
		}
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const updateCampaignOccasion = async (req: Request, res: Response, next: NextFunction) => {
	const reqFiles = req.files as { occasionImages?: Express.Multer.File[] };
	const images = reqFiles?.occasionImages ?? [];
	let transaction: Transaction | null = null;
	try {
		const occasionId = parseInt(req.params.occasionId);
		const params = req.body;
		if (!occasionId) {
			throw new AppError(SYSTEM_ERROR, 'invalid occasionId', false);
		}
		const details = params.occasionDetails
			? (JSON.parse(params.occasionDetails as string) as CreationAttributes<OccasionDetail>[])
			: [];
		const imageDetails = params.occasionImagesData
			? (JSON.parse(params.occasionImagesData as string) as imageUpdateType[])
			: [];
		let occurrences = params.occurrences ?? [];
		if (typeof occurrences == 'string') {
			occurrences = JSON.parse(occurrences) as CreationAttributes<Occurrence>[];
		}
		params.canOverlap = params.canOverlap && params.canOverlap == 'true';
		params.campaignId = params.campaignId ? parseInt(req.body.campaignId) : null;

		transaction = await db.sequelize.transaction();
		const occasion = await db.occasions.findByPk(occasionId, {
			attributes: ['occasionId', 'campaignId'],
			transaction,
		});
		if (occasion == null) {
			throw new AppError(SYSTEM_ERROR, 'occasion does not exist', false);
		}
		const campaignId = occasion.campaignId as number | undefined;
		await Promise.all([
			OccasionService.updateCampaignOccasion(occasionId, params, transaction),
			Array.isArray(details)
				? OccasionService.updateOccasionDetails(occasionId, details, transaction)
				: Promise.resolve(),
			Array.isArray(details)
				? OccasionService.updateOccasionImages(occasionId, images, imageDetails, transaction)
				: Promise.resolve(),
		])
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitOccasion({ occasionId, campaignId });
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};
export const updateOccasion = async (req: Request, res: Response, next: NextFunction) => {
	const reqFiles = req.files as { occasionImages?: Express.Multer.File[] };
	const images = reqFiles?.occasionImages ?? [];
	let transaction: Transaction | null = null;
	try {
		const occasionId = parseInt(req.params.occasionId);
		const params = req.body;
		if (!occasionId) {
			throw new AppError(SYSTEM_ERROR, 'invalid occasionId', false);
		}
		const details = params.occasionDetails
			? (JSON.parse(params.occasionDetails as string) as CreationAttributes<OccasionDetail>[])
			: [];
		const imageDetails = params.occasionImagesData
			? (JSON.parse(params.occasionImagesData as string) as imageUpdateType[])
			: [];
		let occurrences = params.occurrences ?? [];
		if (typeof occurrences == 'string') {
			occurrences = JSON.parse(occurrences) as CreationAttributes<Occurrence>[];
		}
		params.canOverlap = params.canOverlap && params.canOverlap == 'true';
		params.categoryId = params.categoryId ? parseInt(req.body.categoryId) : null;

		transaction = await db.sequelize.transaction();
		const occasion = await db.occasions.findByPk(occasionId, {
			attributes: ['occasionId', 'categoryId'],
			transaction,
		});
		if (occasion == null) {
			throw new AppError(SYSTEM_ERROR, 'occasion does not exist', false);
		}
		const categoryId = occasion.categoryId as number | undefined;
		const [occasionUpdate] = await Promise.all([
			OccasionService.updateOccasion(occasionId, params, transaction),
			Array.isArray(details)
				? OccasionService.updateOccasionDetails(occasionId, details, transaction)
				: Promise.resolve(),
			Array.isArray(details)
				? OccasionService.updateOccasionImages(occasionId, images, imageDetails, transaction)
				: Promise.resolve(),
		]);

		await transaction?.commit();
		SocketServerService.emitOccasion({ occasionId, categoryId });
		SocketServerService.emitRegistration({
			memberId: (occasionUpdate as any).memberId as number,
			occasionId: null,
		});
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const updateOccasionOrder = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const params = req.body.occasions as { occasionId: number; showOrder: number }[];
		if (!Array.isArray(params) || params.length == 0) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		const occasion = await db.occasions.findOne({
			where: { occasionId: params[0].occasionId },
			attributes: ['occasionId', 'categoryId'],
			transaction,
		});
		if (occasion == null) {
			throw new AppError(SYSTEM_ERROR, 'occasion does not exist', false);
		}
		const categoryId = occasion.categoryId as number | undefined;
		await OccasionService.updateOccasionOrder(params, transaction)
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitOccasion({ categoryId });
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const deleteOccasion = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const occasionId = parseInt(req.params.occasionId);
	try {
		if (!occasionId) {
			throw new AppError(SYSTEM_ERROR, 'invalid occasionId', false);
		}
		transaction = await db.sequelize.transaction();
		const occasion = await db.occasions.findByPk(occasionId, {
			attributes: ['occasionId', 'categoryId'],
			transaction,
		});
		if (occasion == null) {
			throw new AppError(SYSTEM_ERROR, 'occasion does not exist', false);
		}
		const categoryId = occasion.categoryId as number | undefined;
		const campaignId = occasion.campaignId as number | undefined;
		await OccasionService.deleteOccasion(occasionId, transaction)
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitOccasion({ occasionId, categoryId, campaignId });
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};
