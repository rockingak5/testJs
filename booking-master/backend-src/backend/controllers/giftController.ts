import { Request, Response, NextFunction } from 'express';
import moment = require('moment');
import path = require('path');
import { CreationAttributes, Op, Transaction } from 'sequelize';
import { RESPONSE_SUCCESS, systemConfig, SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { OccasionDetail } from '../models/occasionDetailModel';
import { Occurrence } from '../models/occurrenceModel';
import { GiftService, SocketServerService } from '../services';
import { AppError, FileOps } from '../utilities';
// import { CategoryTag } from '../models/categoryTagModel'

export const listGiftBare = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const include =
			req.query.includePic == 'true' ? { association: db.occasions.associations.occasionImages } : undefined;
		const isParanoid = req.query.includeDestroyed == 'true' ? false : true;

		await GiftService.listGiftsBare(include, isParanoid).then((giftList) => res.send(giftList));
	} catch (e) {
		next(e);
	}
};

// export const listGiftTags = async (req: Request, res: Response, next: NextFunction) => {
// 	try {
// 		const tags = await GiftService.listGiftTags()
// 		res.send(tags)
// 	} catch (e) {
// 		next(e)
// 	}
// }

export const detailOccasion_Master = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const giftId = parseInt(req.params.giftId);
		const search = req.query.search;

		if (!giftId || isNaN(giftId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid giftId', false);
		}
		const from = req.query.from ? moment(req.query.from as string) : moment().startOf('month').toDate();
		const to = req.query.to ? moment(req.query.to as string) : moment().endOf('month').toDate();
		const occurrenceWhere = { startAt: { [Op.between]: [from, to] } };
		const isParanoid = req.query.includeDestroyed == 'true' ? false : true;
		await GiftService.detailOccasion_Master({ giftId, isParanoid, occurrenceWhere, search }).then((occasion) =>
			res.send(occasion),
		);
	} catch (e) {
		next(e);
	}
};

export const browseGiftMaster = async (req: Request, res: Response, next: NextFunction) => {
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
		await GiftService.browseGiftsMaster(campaignId, condition).then((gifts) => res.send({ ...condition, ...gifts }));
		//res.send({ pp: condition.pp, p: condition.p, sort: condition.sort, sortKey: condition.sortKey, ...occasions }));
	} catch (e) {
		console.log(e);

		next(e);
	}
};

export const createCampaignGift = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const reqFiles = req.files as { occasionImages?: Express.Multer.File[] };
	const images = reqFiles?.occasionImages ?? [];

	try {
		const params = req.body;

		if (!params.title || !params.total || isNaN(params.campaignId) || !params.campaignId) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const details = params.occasionDetails
			? (JSON.parse(params.occasionDetails as string) as CreationAttributes<OccasionDetail>[])
			: [];
		const imageDetails = params.occasionImagesData
			? (JSON.parse(params.occasionImagesData as string) as imageUpdateType[])
			: [];
		// const tags = params.categoryTags
		// 	? (JSON.parse(params.categoryTags as string) as CreationAttributes<CategoryTag>[])
		// 	: []
		params.canOverlap = params.canOverlap && params.canOverlap == 'true';

		params.campaignId = parseInt(params.campaignId);
		transaction = await db.sequelize.transaction();
		const gift = await GiftService.createCampaignGift(params, transaction);

		await Promise.all([
			Array.isArray(details) && details.length > 0
				? GiftService.updateOccasionDetails(gift.giftId, details, transaction)
				: Promise.resolve(),
			Array.isArray(images) && images.length > 0 && Array.isArray(imageDetails) && imageDetails.length > 0
				? GiftService.updateOccasionImages(gift.giftId, images, imageDetails, transaction)
				: Promise.resolve(),
			// Array.isArray(tags) && tags.length > 0
			// 	? GiftService.updateGiftTags(gift.giftId, tags, transaction)
			// 	: Promise.resolve()
		])
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitGift({ giftId: gift.giftId, campaignId: gift.campaignId as number | undefined });
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		console.log(e);

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
		const giftId = parseInt(req.params.giftId);
		const params = req.body;
		if (!giftId) {
			throw new AppError(SYSTEM_ERROR, 'invalid giftId', false);
		}
		const details = params.occasionDetails
			? (JSON.parse(params.occasionDetails as string) as CreationAttributes<OccasionDetail>[])
			: [];
		const imageDetails = params.occasionImagesData
			? (JSON.parse(params.occasionImagesData as string) as imageUpdateType[])
			: [];
		// const tags = params.categoryTags
		// 	? (JSON.parse(params.categoryTags as string) as CreationAttributes<CategoryTag>[])
		// 	: []
		let occurrences = params.occurrences ?? [];
		if (typeof occurrences == 'string') {
			occurrences = JSON.parse(occurrences) as CreationAttributes<Occurrence>[];
		}
		params.canOverlap = params.canOverlap && params.canOverlap == 'true';
		params.campaignId = params.campaignId ? parseInt(req.body.campaignId) : null;

		transaction = await db.sequelize.transaction();
		const gift = await db.gifts.findByPk(giftId, {
			attributes: ['giftId', 'campaignId'],
			transaction,
		});
		if (gift == null) {
			throw new AppError(SYSTEM_ERROR, 'gift does not exist', false);
		}
		const campaignId = gift.campaignId as number | undefined;
		await Promise.all([
			GiftService.updateCampaignGift(giftId, params, transaction),
			Array.isArray(details) ? GiftService.updateOccasionDetails(giftId, details, transaction) : Promise.resolve(),
			Array.isArray(details)
				? GiftService.updateOccasionImages(giftId, images, imageDetails, transaction)
				: Promise.resolve(),
			// Array.isArray(tags) && tags.length > 0
			// 	? GiftService.updateGiftTags(gift.giftId, tags, transaction)
			// 	: Promise.resolve()
		])
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitGift({ giftId, campaignId });
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const updateGiftOrder = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const params = req.body.gifts as { giftId: number; showOrder: number }[];
		if (!Array.isArray(params) || params.length == 0) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		const gift = await db.gifts.findOne({
			where: { giftId: params[0].giftId },
			attributes: ['giftId', 'campaignId'],
			transaction,
		});
		if (gift == null) {
			throw new AppError(SYSTEM_ERROR, 'gift does not exist', false);
		}
		const campaignId = gift.campaignId as number | undefined;
		await GiftService.updateGiftOrder(params, transaction)
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitGift({ campaignId });
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};
export const updateGift = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const params = req.body.gifts as { giftId: number; available: boolean; total: number | null }[];
		if (!Array.isArray(params) || params.length == 0) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();

		await GiftService.updateGift(params, transaction).then(() => {
			transaction?.commit();
			res.sendStatus(RESPONSE_SUCCESS);
		});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const deleteGift = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const giftId = parseInt(req.params.giftId);
	try {
		if (!giftId) {
			throw new AppError(SYSTEM_ERROR, 'invalid giftId', false);
		}
		transaction = await db.sequelize.transaction();
		const gift = await db.gifts.findByPk(giftId, {
			attributes: ['giftId', 'campaignId'],
			transaction,
		});
		if (gift == null) {
			throw new AppError(SYSTEM_ERROR, 'gift does not exist', false);
		}
		const campaignId = gift.campaignId as number | undefined;
		await GiftService.deleteGift(giftId, transaction)
			.then(() => transaction?.commit())
			.then(() => {
				SocketServerService.emitGift({ giftId, campaignId });
				res.sendStatus(RESPONSE_SUCCESS);
			});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};
