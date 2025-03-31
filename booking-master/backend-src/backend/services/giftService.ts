import path = require('path');
import {
	Op,
	literal,
	col,
	cast,
	fn,
	Transaction,
	CreationAttributes,
	WhereAttributeHash,
	IncludeOptions,
	// QueryTypes
} from 'sequelize';
import { systemConfig, SYSTEM_ERROR, BAD_REQUEST } from '../config';
import { db } from '../models';
import { OccasionDetail } from '../models/occasionDetailModel';
import { OccasionImage } from '../models/occasionImageModel';
import { Occasion } from '../models/occasionModel';
import { AppError, FileOps, writeLog } from '../utilities';
import moment = require('moment');
import { Gift } from '../models/giftModel';
import { LineService } from '.';
// import { CategoryTag } from '../models/categoryTagModel'

export const listGiftsBare = async (include?: IncludeOptions | IncludeOptions[], isParanoid = true) =>
	db.gifts.findAll({
		where: { default: false },
		attributes: ['giftId', 'campaignId', 'title'],
		order: [['showOrder', 'asc']],
		include: include,
		paranoid: isParanoid,
	});
// export const listGiftTags = async (transaction?: Transaction) =>
// 	db.sequelize.query(
// 		`SELECT DISTINCT contents, showOrder FROM ${db.categoryTags.tableName} WHERE giftId IS NOT NULL ORDER BY showOrder ASC;`,
// 		{ type: QueryTypes.SELECT, transaction }
// 	)
// export const updateGiftTags = async (
// 	giftId: number,
// 	tags: CreationAttributes<CategoryTag>[],
// 	transaction?: Transaction
// ) =>
// 	db.categoryTags
// 		.count({
// 			where: { giftId: giftId },
// 			transaction
// 		})
// 		.then((toDestroy) => {
// 			if (toDestroy > 0) {
// 				return db.categoryTags.destroy({ where: { giftId: giftId }, transaction })
// 			} else {
// 				return
// 			}
// 		})
// 		.then(() =>
// 			db.categoryTags.bulkCreate(
// 				tags.map((t) => ({ ...t, giftId: giftId })),
// 				{
// 					fields: ['giftId', 'contents', 'showOrder'],
// 					transaction
// 				}
// 			)
// 		)

export const detailOccasion_Master = async ({
	giftId,
	isParanoid = true,
	occurrenceWhere,
	transaction,
	search,
}: {
	giftId: number;
	isParanoid: boolean;
	occurrenceWhere?: WhereAttributeHash;
	transaction?: Transaction;
	search: any;
}) => {
	const occasionInfo = await db.gifts.findByPk(giftId, {
		include: [
			{
				association: db.gifts.associations.occasionDetails,
				attributes: { exclude: ['occasionDetailId', 'giftId'] },
			},
			{
				association: db.gifts.associations.occasionImages,
				attributes: { exclude: ['occasionImageId', 'giftId'] },
			},
		],
		order: [
			[db.occasionDetails, col('showOrder'), 'asc'],
			[db.occasionImages, col('showOrder'), 'asc'],
		],
	});
	let start: any;
	let end: any;
	if (search && search.length === 2) {
		start = moment(search[0]);
		end = moment(search[1]);
	}

	return { ...occasionInfo?.toJSON() };
};
const randomByRange = (maximum: number, minimum: number) => Math.floor(Math.random() * (maximum - minimum)) + minimum;

export const memberWinners = async ({
	listMemberIds,
	giftIds,
	registrationIds,
	campaignId,
	transaction,
}: {
	listMemberIds: {
		memberId: number;
		registrationId: number;
		lineId: string;
	}[];
	registrationIds: number[];
	giftIds: number[];
	campaignId: number;
	transaction?: Transaction;
}) => {
	const gifts = await db.gifts.findAll({
		where: { giftId: { [Op.in]: giftIds }, campaignId },
		include: [
			{
				association: db.gifts.associations.Campaign,
			},
			{
				association: db.gifts.associations.memberGifts,
			},
			{
				association: db.gifts.associations.occasionImages,
			},
		],
	});

	if (gifts?.length !== giftIds?.length) {
		throw new AppError(SYSTEM_ERROR, 'giftIds error', false);
	}

	const dataGifts = gifts?.map((item) => {
		const image = item?.occasionImages?.find((item) => item.showOrder === 0);

		return {
			giftId: item?.giftId,
			isSendGiftImage: item?.isSendGiftImage,
			picUrl: image?.picUrl,
			total: item?.total - (item?.memberGifts?.length || 0),
		};
	});

	const giftMap = new Map();
	dataGifts.forEach((gift) => {
		giftMap.set(gift.giftId, dataGifts);
	});

	const result = listMemberIds?.reduce((acc: any, member) => {
		const giftIndex = randomByRange(1, giftMap.size);
		const gift = dataGifts[giftIndex - 1];

		if (!giftMap.size) {
			return acc;
		}

		const total = giftMap.get(gift.giftId)?.total - 1;
		giftMap.set(gift.giftId, {
			...gift,
			total: total,
		});
		if (total <= 0) {
			giftMap.delete(gift.giftId);
		}
		return [
			...acc,
			{
				giftId: gift.giftId,
				isSendGiftImage: gift?.isSendGiftImage,
				picUrl: gift?.picUrl,
				memberId: member?.memberId,
				registrationId: member?.registrationId,
				lineId: member?.lineId,
			},
		];
	}, []);

	const campaign = await db.campaigns.findOne({
		where: { campaignId },
	});
	if (!campaign?.isMultipleWinners) {
		const registration = await db.registrations.findOne({
			include: [
				{
					association: db.registrations.associations.memberGifts,
					where: {
						registrationId: {
							[Op.in]: registrationIds,
						},
					},
				},
			],
			attributes: ['registrationId'],
			transaction,
		});
		if (registration) throw new AppError(BAD_REQUEST, 'User can only win once in that campaign', false);
	}

	await Promise.all([
		db.memberGifts.bulkCreate(result, { transaction }),
		result
			?.map((item: { isSendGiftImage: boolean; lineId: string; picUrl: string; registrationId: number }) => {
				if (item?.lineId && item?.isSendGiftImage && item?.picUrl) {
					const url = process.env.HOST
						? `${process.env.HOST}/uploads/occasions/${item?.picUrl}`
						: `${systemConfig.PATH_FILE_UPLOAD_OCCASION}/${item?.picUrl}`;

					return LineService.sendImageMessage(item?.lineId, url).catch((err) =>
						writeLog(
							`failed to send message on booking ${item?.lineId}, ${item?.registrationId} ${err.toString()}`,
							'info',
						),
					);
				}
				return false;
			})
			?.filter((item: any) => item),
	]);
};

export const automaticMemberWinners = async ({
	listMemberIds,
	giftIds,
	registrationIds,
	campaignId,
	transaction,
}: {
	listMemberIds: {
		memberId: number;
		registrationId: number;
	}[];
	registrationIds: number[];
	giftIds: number[];
	campaignId: number;
	transaction?: Transaction;
}) => {
	const [gifts, registrations] = await Promise.all([
		db.gifts.findAll({
			where: { giftId: { [Op.in]: giftIds }, campaignId },
			include: [
				{
					association: db.gifts.associations.Campaign,
				},
				{
					association: db.gifts.associations.memberGifts,
				},
			],
		}),
		db.registrations.findAll({
			where: {
				campaignId,
				registrationId: {
					[Op.notIn]: registrationIds,
				},
				isWin: false,
			},
			include: [
				{
					association: db.registrations.associations.memberGifts,
					required: false,
					where: {
						memberGiftId: null,
					},
				},
			],
			attributes: ['memberId', 'registrationId'],
			transaction,
		}),
	]);

	if (gifts?.length !== giftIds?.length) {
		throw new AppError(SYSTEM_ERROR, 'giftIds error', false);
	}

	const dataGifts = gifts?.map((item) => ({
		giftId: item?.giftId,
		total: item?.total - (item?.memberGifts?.length || 0),
	}));

	const sumTotal = dataGifts?.reduce((sum: number, gift) => {
		return sum + gift?.total;
	}, 0);

	const quantityMemberRandom = sumTotal - registrationIds.length;

	const listMemberRandom = [];
	const registrationsClone = [...registrations];
	if (quantityMemberRandom > 0) {
		for (let i = 1; i <= quantityMemberRandom; i++) {
			if (!registrationsClone?.length) {
				break;
			}
			const registrationIndex = randomByRange(1, registrationsClone?.length);
			const registration = registrationsClone[registrationIndex - 1];

			listMemberRandom.push({
				memberId: registration?.memberId,
				registrationId: registration?.registrationId,
			});
			registrationsClone.splice(registrationIndex - 1, 1);
		}
	}

	const giftMap = new Map();
	dataGifts.forEach((gift) => {
		giftMap.set(gift.giftId, dataGifts);
	});

	const result = [...listMemberIds, ...listMemberRandom]?.reduce((acc: any, member) => {
		const giftIndex = randomByRange(1, giftMap.size);
		const gift = dataGifts[giftIndex - 1];

		if (!giftMap.size) {
			return acc;
		}

		const total = giftMap.get(gift.giftId)?.total - 1;
		giftMap.set(gift.giftId, {
			...gift,
			total: total,
		});
		if (total <= 0) {
			giftMap.delete(gift.giftId);
		}
		return [
			...acc,
			{
				giftId: gift.giftId,
				memberId: member?.memberId,
				registrationId: member?.registrationId,
			},
		];
	}, []);

	const campaign = await db.campaigns.findOne({
		where: { campaignId },
	});
	if (!campaign?.isMultipleWinners) {
		const registration = await db.registrations.findOne({
			include: [
				{
					association: db.registrations.associations.memberGifts,
					where: {
						registrationId: {
							[Op.in]: registrationIds,
						},
					},
				},
			],
			attributes: ['registrationId'],
			transaction,
		});
		if (registration) throw new AppError(BAD_REQUEST, 'User can only win once in that campaign', false);
	}

	// const listRegistrationIds = listMemberRandom?.map((item) => item?.registrationId)
	const listRegistrationIds = result?.map((item: { registrationId: number }) => item?.registrationId);

	return listRegistrationIds || [];

	// return Promise.all([
	// 	db.registrations.update(
	// 		{ isWin: true },
	// 		{
	// 			where: {
	// 				registrationId: {
	// 					[Op.in]: listRegistrationIds
	// 				},
	// 				campaignId
	// 			},
	// 			transaction
	// 		}
	// 	),
	// 	db.memberGifts.bulkCreate(result, { transaction })
	// ])
};

export const detailOccasion_Member = async (
	occasionWhere?: WhereAttributeHash,
	occurrenceWhere?: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const occasionInfo = await db.occasions
		.findOne({
			where: occasionWhere,
			attributes: { exclude: ['isDisplayed', 'showOrder', 'createdAt', 'updatedAt', 'deletedAt'] },
			include: [
				{
					separate: true,
					association: db.occasions.associations.occasionDetails,
					attributes: { exclude: ['occasionDetailId', 'occasionId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					separate: true,
					association: db.occasions.associations.occasionImages,
					attributes: { exclude: ['occasionImageId', 'occasionId'] },
					order: [[col('showOrder'), 'asc']],
				},
			],
			transaction,
		})
		.then((o) => o?.toJSON());
	if (occasionInfo == null) {
		throw new AppError(SYSTEM_ERROR, `occasion ${JSON.stringify(occasionWhere)} does not exist`, false);
	} else if (occasionInfo.isDisplayed == false) {
		return { ...occasionInfo, occurrences: [] };
	}
	const occurrences = await db.occurrences
		.findAll({
			where: {
				[Op.or]: [
					{ occasionId: occasionInfo.occasionId, ...occurrenceWhere },
					{ '$Occasion.isSettingTime$': true, occasionId: occasionInfo.occasionId },
				],
			},
			attributes: {
				include: [
					[fn('DATE_FORMAT', literal('DATE_ADD(`startAt`, INTERVAL 9 HOUR)'), '%Y-%m-%d'), 'groupDate'],
					[cast(fn('IFNULL', fn('SUM', col('registrations.expected')), 0), 'signed'), 'sumExpected'],
					[cast(fn('IFNULL', fn('SUM', col('registrations.attended')), 0), 'signed'), 'sumAttended'],
				],
				exclude: ['occasionId', 'createdAt', 'updatedAt', 'deletedAt'],
			},
			include: [
				{
					association: db.occurrences.associations.registrations,
					attributes: [],
				},
				{
					association: db.occurrences.associations.Occasion,
					attributes: [],
				},
			],
			group: [col('occurrenceId')],
			order: [['startAt', 'ASC']],
			transaction,
		})
		.then((os) => os.map((o) => o.toJSON()));
	return { ...occasionInfo, occurrences };
};

export const browseGiftsMember = async (
	campaignId: number,
	pagination: paginationParams,
	occasionWhere?: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const giftCount = await db.gifts.findAll({
		attributes: ['giftId'],
		where: { campaignId: campaignId, isDisplayed: true },
		limit: pagination.pp,
		offset: (pagination.p - 1) * pagination.pp,
		transaction,
	});
	const giftIds = giftCount.map((o) => o.giftId);
	if (giftIds.length > 0) {
		const rows = await db.gifts
			.findAll({
				where: { campaignId: campaignId, giftId: { [Op.in]: giftIds }, default: false, ...occasionWhere },
				include: [
					{
						separate: true,
						association: db.gifts.associations.occasionDetails,
						attributes: { exclude: ['occasionDetailId', 'occasionId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.gifts.associations.occasionImages,
						attributes: { exclude: ['occasionImageId', 'occasionId'] },
						order: [[col('showOrder'), 'asc']],
					},
				],
				order: [[col(pagination.sortKey), pagination.sort]],
				limit: pagination.pp,
				transaction,
			})
			.then((os) => os.map((o) => o.toJSON()));
		return { count: giftIds.length, rows: rows };
	} else {
		return { rows: [], count: 0 };
	}
};

export const browseGiftsMaster = async (
	campaignId: number,
	pagination: paginationParams,
	transaction?: Transaction,
) => {
	const [gifts, giftDefault] = await Promise.all([
		db.gifts.findAll({
			where: { campaignId: campaignId, default: false },
			include: [
				{
					separate: true,
					association: db.gifts.associations.occasionDetails,
					attributes: { exclude: ['occasionDetailId', 'giftId'] },
					order: [['showOrder', 'asc']],
				},
				{
					separate: true,
					association: db.gifts.associations.occasionImages,
					attributes: { exclude: ['occasionImageId', 'giftId'] },
					order: [['showOrder', 'asc']],
				},
				{
					association: db.gifts.associations.memberGifts,
					attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
				},
			],
			order: [[col('giftId'), 'asc']],
			limit: pagination.pp,
			transaction,
		}),
		db.gifts.findOne({
			where: { campaignId: campaignId, default: true },

			include: [
				{
					association: db.gifts.associations.memberGifts,
					attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
				},
			],
			transaction,
		}),
	]);
	return { rows: gifts ?? {}, giftDefault: giftDefault ?? {} };
};

export const createOccasion = async (params: CreationAttributes<Occasion>, transaction?: Transaction) =>
	db.occasions
		.increment(
			{ showOrder: 1 },
			{
				where: { categoryId: params.categoryId },
				transaction,
			},
		)
		.then(() =>
			db.occasions.create(
				{
					categoryId: params.categoryId,
					title: params.title,
					description: params.description,
					canOverlap: params.canOverlap,
					isDisplayed: params.isDisplayed,

					isSettingTime: params.isSettingTime,
					...(params.isSettingTime
						? {
								startRegistration: params.startRegistration,
								endRegistration: params.endRegistration,
								startDate: params.startDate,
								endDate: params.endDate,
								numberOfPeople: params.numberOfPeople,
						  }
						: {}),
					message: params?.message && Array.isArray(JSON.parse(params?.message as any)) ? (params?.message as any) : [],
					notRegisterEventSameTime: params.isMultiEvent ? params.notRegisterEventSameTime : false,
					isMultiEvent: params.isMultiEvent,
				},
				{ transaction },
			),
		);
export const createCampaignGift = async (params: CreationAttributes<Gift>, transaction?: Transaction) =>
	db.gifts
		.increment(
			{ showOrder: 1 },
			{
				where: { campaignId: params.campaignId },
				transaction,
			},
		)
		.then(() =>
			db.gifts.create(
				{
					campaignId: params.campaignId,
					title: params.title,
					description: params.description,
					canOverlap: params.canOverlap,
					isDisplayed: params.isDisplayed,
					total: params.total,
					isSendGiftImage: params.isSendGiftImage,
					type: params.type,
				},
				{ transaction },
			),
		);
export const updateOccasion = async (
	occasionId: number,
	params: CreationAttributes<Occasion>,
	transaction?: Transaction,
) => {
	const occasions = await db.occasions.findByPk(occasionId);

	if (occasions == null) {
		throw new AppError(SYSTEM_ERROR, 'occasions does not exist', false);
	}
	const startRegistration = moment(occasions?.startRegistration);

	if (
		occasions?.isSettingTime &&
		params?.startDate !== occasions?.startDate &&
		params?.endDate !== occasions?.endDate
	) {
		if (moment().isBefore(startRegistration)) {
			const startDate = moment(params?.startDate).format('YYYY-MM-DD');
			const endDate = moment(params?.endDate).format('YYYY-MM-DD');

			const dataCreateOccurrences = Array.from(new Array(moment(endDate).diff(moment(startDate), 'days') + 1)).map(
				(item, i) => ({
					maxAttendee: params?.numberOfPeople,
					startAt: moment(params?.startDate).add(i, 'days'),
					occurrenceId: null,
					endAt: params?.endDate,
					categoryId: occasions?.categoryId,
					occasionId: occasions?.occasionId,
					startDate: moment(params?.startDate).add(i, 'days'),
					isDisplayed: params.isDisplayed,
					isSettingTime: occasions.isSettingTime,
					deletedAt: null,
				}),
			);

			await db.occurrences.destroy({
				where: {
					occasionId: occasions?.occasionId,
				},
				transaction,
			});

			await db.occurrences.bulkCreate(dataCreateOccurrences as any, {
				transaction,
			});
		} else if (params?.numberOfPeople !== occasions?.numberOfPeople) {
			await db.occurrences.update(
				{ maxAttendee: params?.numberOfPeople },
				{
					where: {
						occasionId: occasions?.occasionId,
					},
					transaction,
				},
			);
		} else {
			if (params?.startDate) {
				if (!moment(params?.startDate).isSame(moment(occasions?.startDate))) {
					throw new AppError(BAD_REQUEST, 'not update startDate', false);
				}
			}
			if (params?.endDate) {
				if (!moment(params?.endDate).isSame(moment(occasions?.endDate))) {
					throw new AppError(BAD_REQUEST, 'not update endDate', false);
				}
			}
		}
	}

	return db.occasions.update(
		{
			title: params.title,
			description: params.description,
			canOverlap: params.canOverlap,
			isDisplayed: params.isDisplayed,

			...(occasions?.isSettingTime && moment().isBefore(startRegistration)
				? {
						startDate: params.startDate,
						endDate: params.endDate,
				  }
				: {}),
			...(occasions?.isSettingTime
				? {
						startRegistration: params.startRegistration,
						endRegistration: params.endRegistration,
						numberOfPeople: params.numberOfPeople,
				  }
				: {}),
			// isProgram: params.isProgram,
			message: params?.message && Array.isArray(JSON.parse(params?.message as any)) ? (params?.message as any) : [],
			notRegisterEventSameTime: params.notRegisterEventSameTime,
			isMultiEvent: params.isMultiEvent,
		},
		{
			where: { occasionId: occasionId },
			transaction,
		},
	);
};
export const updateCampaignGift = async (
	giftId: number,
	params: CreationAttributes<Gift>,
	transaction?: Transaction,
) => {
	const gifts = await db.gifts.findByPk(giftId);

	if (gifts == null) {
		throw new AppError(SYSTEM_ERROR, 'gifts does not exist', false);
	}

	return db.gifts.update(
		{
			title: params.title,
			description: params.description,
			canOverlap: params.canOverlap,
			isDisplayed: params.isDisplayed,
			total: params.total,
			isSendGiftImage: params.isSendGiftImage,
			type: params.type,
		},
		{
			where: { giftId: giftId },
			transaction,
		},
	);
};

export const updateGiftOrder = async (params: { giftId: number; showOrder: number }[], transaction?: Transaction) =>
	db.gifts.findAll({ where: { giftId: { [Op.in]: params.map((p) => p.giftId) } }, transaction }).then((gifts) =>
		Promise.all(
			gifts.map((o) => {
				const uo = params.find((p) => p.giftId == o.giftId);
				if (uo == undefined) {
					throw new Error(`uo not found ${o.giftId}`);
				} else {
					return o.update({ showOrder: uo.showOrder }, { transaction });
				}
			}),
		),
	);

export const updateGift = async (
	params: { giftId: number; available: boolean; total: number | null }[],
	transaction?: Transaction,
) =>
	db.gifts.findAll({ where: { giftId: { [Op.in]: params.map((p) => p.giftId) } }, transaction }).then((gifts) =>
		Promise.all(
			gifts.map((g) => {
				const ug = params.find((p) => p.giftId == g.giftId);
				if (ug == undefined) {
					throw new Error(`uo not found ${g.giftId}`);
				} else {
					return g.update({ available: ug?.available, total: ug?.available ? ug.total || 0 : 0 }, { transaction });
				}
			}),
		),
	);
export const updateOccasionDetails = async (
	giftId: number,
	details: CreationAttributes<OccasionDetail>[],
	transaction?: Transaction,
) =>
	db.occasionDetails
		.destroy({
			where: { giftId: giftId },
			transaction,
		})
		.then(() =>
			db.occasionDetails.bulkCreate(
				details.map((d) => ({ ...d, giftId: giftId })),
				{
					fields: ['giftId', 'label', 'value', 'showOrder'],
					transaction,
				},
			),
		);

export const updateOccasionImages = async (
	giftId: number,
	images: Express.Multer.File[],
	imageDetails: imageUpdateType[],
	transaction?: Transaction,
) => {
	let toRemove: OccasionImage[] = [];
	const toAdd: CreationAttributes<OccasionImage>[] = [];
	const toChange: { occasionImageId: number; showOrder: number }[] = [];
	const imagesInDB = await db.occasionImages.findAll({ where: { giftId: giftId }, transaction });
	for (const pD of imageDetails) {
		const picInDB = imagesInDB.find((pI: OccasionImage) => pI.picUrl == pD.originalName);
		if (picInDB == undefined) {
			const picFile = images.find((p) => p.originalname == pD.originalName)?.filename;
			toAdd.push({
				giftId: giftId,
				picUrl: picFile ? picFile : pD.originalName,
				showOrder: pD.showOrder,
			});
		} else if (picInDB != undefined && picInDB.showOrder != pD.showOrder) {
			toChange.push({ occasionImageId: picInDB.occasionImageId, showOrder: pD.showOrder });
		}
	}
	toRemove = imagesInDB.filter((pI) => imageDetails.every((pD) => pD.originalName != pI.picUrl));
	return await Promise.all([
		removeOccasionImageFiles(toRemove.map((pI) => pI.picUrl)),
		removeOccasionImages(
			toRemove.map((pI) => pI.occasionImageId),
			transaction,
		),
	]).then(() => Promise.all([changeOccasionImageOrders(toChange, transaction), addOccasionImages(toAdd, transaction)]));
};

export const deleteGift = async (giftId: number, transaction?: Transaction) =>
	Promise.all([
		db.gifts.destroy({ where: { giftId }, transaction }),
		db.occasionImages
			.findAll({ attributes: ['picUrl'], where: { giftId }, transaction })
			.then((occasionImages) => removeOccasionImageFiles(occasionImages.map((oI) => oI.picUrl))),
	]);

export const deleteOccasionByCategoryId = async (categoryId: number, transaction?: Transaction) =>
	db.occasions
		.findAll({
			attributes: ['occasionId'],
			where: { categoryId: categoryId },
			include: { separate: true, association: db.occasions.associations.occasionImages, attributes: ['picUrl'] },
			transaction,
		})
		.then((occasions) => {
			const picUrls: string[] = [];
			const occasionIds: number[] = [];
			occasions.forEach((o) => {
				occasionIds.push(o.occasionId);
				if (o.occasionImages) {
					o.occasionImages.forEach((oI) => picUrls.push(oI.picUrl));
				}
			});
			return Promise.all([
				db.occasionImages.destroy({ where: { occasionId: { [Op.in]: occasionIds } } }),
				db.occasions.destroy({ where: { categoryId: categoryId }, transaction }),
				removeOccasionImageFiles(picUrls),
			]);
		});
export const deleteOccasionByCampaignId = async (campaignId: number, transaction?: Transaction) =>
	db.occasions
		.findAll({
			attributes: ['occasionId'],
			where: { campaignId: campaignId },
			include: { separate: true, association: db.occasions.associations.occasionImages, attributes: ['picUrl'] },
			transaction,
		})
		.then((occasions) => {
			const picUrls: string[] = [];
			const occasionIds: number[] = [];
			occasions.forEach((o) => {
				occasionIds.push(o.occasionId);
				if (o.occasionImages) {
					o.occasionImages.forEach((oI) => picUrls.push(oI.picUrl));
				}
			});
			return Promise.all([
				db.occasionImages.destroy({ where: { occasionId: { [Op.in]: occasionIds } } }),
				db.occasions.destroy({ where: { campaignId: campaignId }, transaction }),
				removeOccasionImageFiles(picUrls),
			]);
		});

const addOccasionImages = async (images: CreationAttributes<OccasionImage>[], transaction?: Transaction) =>
	db.occasionImages.bulkCreate(images, {
		fields: ['giftId', 'showOrder', 'picUrl'],
		transaction,
	});

// const removeOccasionImagesByOccasionId = async (occasionId: number | number[], transaction?: Transaction) =>
// 	db.occasionImages.destroy({
// 		where: { occasionId: occasionId },
// 		transaction
// 	})

const removeOccasionImages = async (occasionImageId: number | number[], transaction?: Transaction) =>
	db.occasionImages.destroy({
		where: { occasionImageId: occasionImageId },
		transaction,
	});

const removeOccasionImageFiles = async (picUrls: string[]) =>
	Promise.all(picUrls.map(async (pU) => FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_OCCASION, pU))));

const changeOccasionImageOrders = async (
	images: { occasionImageId: number; showOrder: number }[],
	transaction?: Transaction,
) =>
	Promise.all(
		images.map((i) =>
			db.occasionImages.update(
				{ showOrder: i.showOrder },
				{
					where: { occasionImageId: i.occasionImageId },
					transaction,
				},
			),
		),
	);
