import path = require('path');
import { NextFunction, Request, Response } from 'express';
import moment = require('moment');
import { CreationAttributes, Op, Transaction, UniqueConstraintError, WhereAttributeHash } from 'sequelize';
import { CONFLICT_ERROR, RESPONSE_SUCCESS, systemConfig, SYSTEM_ERROR } from '../config';
import { AppError, FileOps } from '../utilities';
import { db } from '../models';
import { CategoryDetail } from '../models/categoryDetailModel';
import { CategoryTag } from '../models/categoryTagModel';
import { CategoryArea } from '../models/categoryAreaModel';
import {
	CampaignService,
	CategoryService,
	GiftService,
	OccasionService,
	RegistrationService,
	SocketServerService,
} from '../services';
import { CategoryMessage } from '../models/categoryMessageModel';

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

export const createCampaign = async (req: Request, res: Response, next: NextFunction) => {
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
		const imageDetails = params.categoryImagesData
			? (JSON.parse(params.categoryImagesData as string) as imageUpdateType[])
			: [];
		const tags = params.categoryTags
			? (JSON.parse(params.categoryTags as string) as CreationAttributes<CategoryTag>[])
			: [];
		transaction = await db.sequelize.transaction();
		const campaign = await CampaignService.createCampaign(params, transaction);

		await Promise.all([
			Array.isArray(areas) && areas.length > 0
				? CampaignService.updateCampaignAreas(campaign.campaignId, areas, transaction)
				: Promise.resolve(),
			Array.isArray(details) &&
				details.length > 0 &&
				CampaignService.updateCampaignDetails(campaign.campaignId, details, transaction),

			Array.isArray(tags) && tags.length > 0
				? CampaignService.updateCampaignTags(campaign.campaignId, tags, transaction)
				: Promise.resolve(),
			Array.isArray(images) && images.length > 0 && Array.isArray(imageDetails) && imageDetails.length > 0
				? CampaignService.updateCampaignImages(campaign.campaignId, images, imageDetails, transaction)
				: Promise.resolve(),
			db.occurrences.create(
				{
					maxAttendee: 2147483647,
					startAt: campaign?.startRegistration,
					endAt: campaign?.endRegistration,
					campaignId: campaign?.campaignId,
					startDate: campaign?.startRegistration,
					isDisplayed: campaign.isDisplayed,
				},
				{
					transaction,
				},
			),
		]);
		await transaction.commit();
		SocketServerService.emitCampaign({ campaignId: campaign.campaignId });
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

export const browseCampaigns = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const condition: paginationParams = {
			pp: parseInt(req.query.pp as string) || 20,
			p: parseInt(req.query.p as string) || 1,
			sort: (req.query.sort as string as 'asc' | 'desc' | null) || 'asc',
			sortKey: (req.query.sortKey as string) || 'showOrder',
		};
		const campaignWhere: WhereAttributeHash = {};
		if (req.query.title) {
			campaignWhere.title = { [Op.substring]: req.query.title };
		}
		const campaignRowCount = await CampaignService.browseCampaigns(condition, campaignWhere);
		res.send({ ...condition, ...campaignRowCount });
	} catch (e) {
		next(e);
	}
};
export const listCampaignsBare = async (req: Request, res: Response, next: NextFunction) => {
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
		const campaignsBare = await CampaignService.listCampaignsBare(include, isParanoid);
		res.send(campaignsBare);
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

export const listCampaignsTags = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const tags = await CampaignService.listCampaignsTags();
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

export const getCampaignDetailed = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const campaignId = parseInt(req.params.campaignId);
		const search = req.query.search;

		if (!campaignId || isNaN(campaignId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid campaign id');
		}
		const from = req.query.from ? moment(req.query.from as string) : moment().startOf('month').toDate();
		const to = req.query.to ? moment(req.query.to as string) : moment().endOf('month').toDate();

		const occurrenceWhere = { startAt: { [Op.between]: [from, to] } };

		const isParanoid = req.query.includeDestroyed == 'true' ? false : true;
		const category = await CampaignService.detailCampaignMaster({
			campaignId,
			isParanoid,
			occurrenceWhere,
			search,
		});
		res.send(category);
	} catch (e) {
		next(e);
	}
};

export const updateCampaign = async (req: Request, res: Response, next: NextFunction) => {
	const campaignId = parseInt(req.params.campaignId);
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
	let transaction: Transaction | null = null;
	try {
		if (!campaignId) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}

		transaction = await db.sequelize.transaction();
		await Promise.all([
			CampaignService.updateCampaign(campaignId, params, transaction),
			Array.isArray(areas) ? CampaignService.updateCampaignAreas(campaignId, areas, transaction) : Promise.resolve(),
			Array.isArray(details)
				? CampaignService.updateCampaignDetails(campaignId, details, transaction)
				: Promise.resolve(),
			Array.isArray(tags) ? CampaignService.updateCampaignTags(campaignId, tags, transaction) : Promise.resolve(),
			Array.isArray(images) && Array.isArray(imageDetails)
				? CampaignService.updateCampaignImages(campaignId, images, imageDetails, transaction)
				: Promise.resolve(),
		]);
		await transaction?.commit();
		SocketServerService.emitCampaign({ campaignId });
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

export const deleteCampaign = async (req: Request, res: Response, next: NextFunction) => {
	const campaignId = parseInt(req.params.campaignId);
	if (!campaignId) {
		return res.status(SYSTEM_ERROR).send('invalid campaign id');
	}
	let transaction: Transaction | null = null;
	try {
		transaction = await db.sequelize.transaction();
		await Promise.all([
			CampaignService.deleteCampaign(campaignId, transaction),
			OccasionService.deleteOccasionByCampaignId(campaignId, transaction),
		]);
		await transaction.commit();
		SocketServerService.emitCampaign({ campaignId });
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

export const campaignRegisterWinners = async (req: Request, res: Response, next: NextFunction) => {
	const registrationIds: number[] = req.body?.registrationIds;
	const giftIds = req.body?.giftIds;
	const campaignId = req.body?.campaignId;

	let transaction: Transaction | null = null;

	try {
		if (!registrationIds?.length || !giftIds?.length || !campaignId) {
			throw new AppError(SYSTEM_ERROR, 'registrationIds, giftIds, campaignId requied', false);
		}
		transaction = await db.sequelize.transaction();

		const [resUpdate, registrations] = await Promise.all(
			RegistrationService.updateIsWin(registrationIds, campaignId, transaction),
		);

		if (resUpdate?.[0] !== 0 && registrationIds?.length === resUpdate?.[0] && registrations?.length) {
			const listMemberIds = registrations?.map((item: any) => ({
				memberId: item?.memberId,
				registrationId: item?.registrationId,
				lineId: item?.Member?.lineId,
			}));

			await GiftService.memberWinners({
				listMemberIds,
				giftIds,
				campaignId,
				registrationIds,
				transaction,
			});
		}

		await transaction.commit();
		// SocketServerService.emitGift({giftId: })
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		console.log(e);

		if (transaction != null) {
			await transaction.rollback();
		}

		next(e);
	}
};

export const automaticRegisterWinners = async (req: Request, res: Response, next: NextFunction) => {
	const registrationIds: number[] = req.body?.registrationIds;
	const giftIds = req.body?.giftIds;
	const campaignId = req.body?.campaignId;

	let transaction: Transaction | null = null;

	try {
		if (!giftIds?.length || !campaignId) {
			throw new AppError(SYSTEM_ERROR, 'giftIds, campaignId requied', false);
		}
		transaction = await db.sequelize.transaction();

		// const [resUpdate, registrations] = await Promise.all(
		// 	RegistrationService.updateIsWin(registrationIds, campaignId, transaction)
		// )
		const registrations = await db.registrations.findAll({
			where: {
				registrationId: {
					[Op.in]: registrationIds,
				},
				campaignId: campaignId,
				isWin: false,
			},
			transaction,
		});

		// if (registrationIds?.length === resUpdate?.[0]) {
		const listMemberIds = registrations?.map((item: any) => ({
			memberId: item?.memberId,
			registrationId: item?.registrationId,
		}));

		const listRegistrationIds = await GiftService.automaticMemberWinners({
			listMemberIds,
			giftIds,
			campaignId,
			registrationIds,
			transaction,
		});
		// }

		await transaction.commit();
		SocketServerService.emitCampaign({ campaignId });
		res.send(listRegistrationIds);
	} catch (e) {
		console.log(e);

		if (transaction != null) {
			await transaction.rollback();
		}

		next(e);
	}
};
