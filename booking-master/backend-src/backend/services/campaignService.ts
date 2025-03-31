import {
	cast,
	col,
	CreationAttributes,
	fn,
	IncludeOptions,
	literal,
	Op,
	QueryTypes,
	Transaction,
	WhereAttributeHash,
} from 'sequelize';
import { SYSTEM_ERROR } from '../config';
import { CampaignChoice } from '../models/campaignChoiceModel';
import { db } from '../models/index';
import { AppError, RandomSample } from '../utilities';
import * as MemberCsvService from './memberCsvService';
import { Campaign } from '../models/campaignModel';
import moment from 'moment';
import { CategoryArea } from '../models/categoryAreaModel';
import { CategoryDetail } from '../models/categoryDetailModel';
import { CategoryTag } from '../models/categoryTagModel';
import { CategoryImage } from '../models/categoryImageModel';
import { changeCategoryImageOrders, removeCategoryImageFiles, removeCategoryImages } from './categoryService';

export const getCampaignAnswers = async (memberId: number, transaction?: Transaction) =>
	db.campaignAnswers.findAll({
		where: { memberId: memberId },
		attributes: ['campaignQuestionId', 'contents'],
		// include: { association: db.campaignAnswers.associations.CampaignQuestion, attributes: [] },
		// order: [[db.campaignQuestions, 'showOrder', 'asc']],
		transaction,
	});

export const createQuestion = async ({
	contents,
	choices,
	required = false,
	transaction,
}: {
	contents: string;
	required: boolean;
	choices: CreationAttributes<CampaignChoice>[];
	transaction?: Transaction;
}) =>
	db.campaignQuestions
		.increment({ showOrder: 1 }, { where: {}, transaction })
		.then(() => db.campaignQuestions.create({ contents: contents, required, showOrder: 0 }, { transaction }))
		.then((cq) =>
			db.campaignChoices.bulkCreate(
				choices.map((c, i) => ({
					contents: c.contents,
					showOrder: c.showOrder ?? i,
					campaignQuestionId: cq.campaignQuestionId,
				})),
				{ fields: ['campaignQuestionId', 'contents', 'showOrder'], transaction },
			),
		);
export const createQuestionCampaign = async ({
	campaignId = null,
	contents,
	choices,
	type,
	required,
	transaction,
}: {
	campaignId: number | null;
	contents: string;
	type: string;
	required: boolean;
	choices: CreationAttributes<CampaignChoice>[];
	transaction?: Transaction;
}) =>
	db.campaignQuestions
		.increment(
			{ showOrder: 1 },
			{
				where: {
					campaignId,
				},
				transaction,
			},
		)
		.then(() => db.campaignQuestions.create({ campaignId, contents, type, required, showOrder: 0 }, { transaction }))
		.then((cq) =>
			db.campaignChoices.bulkCreate(
				choices.map((c, i) => ({
					contents: c.contents,
					showOrder: c.showOrder ?? i,
					campaignQuestionId: cq.campaignQuestionId,
				})),
				{ fields: ['campaignQuestionId', 'contents', 'showOrder'], transaction },
			),
		);

export const updateQuestion = async (
	campaignQuestionId: number,
	contents: string,
	choices: CreationAttributes<CampaignChoice>[],
	transaction?: Transaction,
) => {
	const campaign = await db.campaignQuestions.findByPk(campaignQuestionId, {
		include: { association: db.campaignQuestions.associations.campaignChoices },
		transaction,
	});
	if (campaign == null) {
		throw new AppError(SYSTEM_ERROR, `campaignQuestion ${campaignQuestionId} does not exist`);
	}
	campaign.set({ contents: contents });
	if (campaign.changed()) {
		await campaign.save({ transaction });
	}
	const oldChoices = campaign.campaignChoices ?? [];
	if (oldChoices.length > 0) {
		await db.campaignChoices.destroy({ where: { campaignQuestionId: campaignQuestionId }, transaction });
	}
	if (choices.length > 0) {
		await db.campaignChoices.bulkCreate(
			choices.map((c, i) => ({
				contents: c.contents,
				showOrder: c.showOrder ?? i,
				campaignQuestionId: campaignQuestionId,
			})),
			{ fields: ['campaignQuestionId', 'contents', 'showOrder'], transaction },
		);
	}
	return;
};
export const listQuestions = async (transaction?: Transaction) =>
	db.campaignQuestions.findAll({
		where: {
			campaignId: null,
		},
		include: {
			association: db.campaignQuestions.associations.campaignChoices,
			attributes: { exclude: ['campaignQuestionId', 'customerRegistrationId'] },
		},
		order: [
			['showOrder', 'asc'],
			[db.campaignChoices, col('showOrder'), 'asc'],
		],
		transaction,
	});
export const listCampaignQuestions = async (campaignId?: number, transaction?: Transaction) =>
	db.campaignQuestions.findAll({
		where: {
			campaignId: campaignId ?? null,
		},
		include: {
			association: db.campaignQuestions.associations.campaignChoices,
			attributes: { exclude: ['campaignQuestionId', 'customerRegistrationId'] },
		},
		order: [
			['showOrder', 'asc'],
			[db.campaignChoices, col('showOrder'), 'asc'],
		],
		transaction,
	});

export const updateQuestionOrder = async (
	params: { campaignQuestionId: number; showOrder: number }[],
	transaction?: Transaction,
) =>
	db.campaignQuestions
		.findAll({ where: { campaignQuestionId: { [Op.in]: params.map((p) => p.campaignQuestionId) } }, transaction })
		.then((campaignQuestions) =>
			Promise.all(
				campaignQuestions.map((c) => {
					const uc = params.find((p) => p.campaignQuestionId == c.campaignQuestionId);
					if (uc == undefined) {
						throw new Error(`uc not found ${c.campaignQuestionId}`);
					} else {
						return c.update({ showOrder: uc.showOrder }, { transaction });
					}
				}),
			),
		);

export const deleteQuestion = async (campaignQuestionId: number, transaction?: Transaction) =>
	db.campaignQuestions.destroy({ where: { campaignQuestionId }, transaction });

export const answerToQuestions = async (
	memberId: number,
	answers: { campaignQuestionId: number; contents: string }[],
	transaction?: Transaction,
) =>
	db.campaignAnswers.bulkCreate(
		answers.map((a) => ({ ...a, memberId: memberId })),
		{
			fields: ['memberId', 'campaignQuestionId', 'contents'],
			transaction,
		},
	);

export const selectCandidates = async (memberWhere: WhereAttributeHash, transaction?: Transaction) =>
	MemberCsvService.getMemberDataList(memberWhere, false, transaction);

export const selectWinners = async (
	memberIds: number[],
	winnersCount = 1,
	timestamp: Date,
	transaction?: Transaction,
) => {
	const winnerIds = memberIds.length < winnersCount ? memberIds : RandomSample(memberIds, winnersCount);
	const candidates = await MemberCsvService.getMemberDataList(
		{
			memberId: { [Op.in]: winnerIds },
			candidateAt: { [Op.is]: null },
			isCampaign: true,
			isRegistered: true,
		},
		false,
		transaction,
	);

	const candidateIds = candidates.map((m) => m.memberId);
	if (candidateIds.length > 0) {
		await db.members.update(
			{ candidateAt: timestamp },
			{
				where: { memberId: { [Op.in]: candidateIds } },
				transaction,
			},
		);
	}
	return candidates;
};
export const countWinners = async (memberWhere: WhereAttributeHash) => db.members.count({ where: memberWhere });

export const resetWinners = async (memberWhere: WhereAttributeHash) =>
	db.members.update({ candidateAt: null }, { where: memberWhere });

export const createCampaign = async (params: CreationAttributes<Campaign>, transaction?: Transaction) =>
	db.campaigns
		.increment(
			{ showOrder: 1 },
			{
				where: { deletedAt: null },
				transaction,
			},
		)
		.then(() =>
			db.campaigns.create(
				{
					title: params.title,
					sub: params.sub ?? '',
					description: params.description,
					campaignText: params.campaignText,
					location: params.location,
					isDisplayed: params.isDisplayed,
					presentIssueTiming: params.presentIssueTiming,
					startRegistration: params.startRegistration,
					endRegistration: params.endRegistration,
					isMultipleWinners: params?.isMultipleWinners,
					isRegisterMultipleTimes: params?.isRegisterMultipleTimes,
					isMultiEvent: params.isMultiEvent,
				},
				{ transaction },
			),
		);
export const updateCampaignAreas = async (
	campaignId: number,
	areas: CreationAttributes<CategoryArea>[],
	transaction?: Transaction,
) =>
	db.categoryAreas
		.count({
			where: { campaignId: campaignId },
			transaction,
		})
		.then((toDestroy) => {
			if (toDestroy > 0) {
				return db.categoryAreas.destroy({ where: { campaignId: campaignId }, transaction });
			} else {
				return;
			}
		})
		.then(() =>
			db.categoryAreas.bulkCreate(
				areas.map((t) => ({ ...t, campaignId: campaignId })),
				{
					fields: ['campaignId', 'contents', 'showOrder'],
					transaction,
				},
			),
		);
export const updateCampaignDetails = async (
	campaignId: number,
	details: CreationAttributes<CategoryDetail>[],
	transaction?: Transaction,
) =>
	db.categoryDetails
		.count({
			where: { campaignId: campaignId },
			transaction,
		})
		.then((toDestroy) => {
			if (toDestroy > 0) {
				return db.categoryDetails.destroy({ where: { campaignId: campaignId }, transaction });
			} else {
				return;
			}
		})
		.then(() =>
			db.categoryDetails.bulkCreate(
				details.map((d) => ({ ...d, campaignId: campaignId })),
				{
					fields: ['campaignId', 'label', 'value', 'showOrder'],
					transaction,
				},
			),
		);
export const updateCampaignTags = async (
	campaignId: number,
	tags: CreationAttributes<CategoryTag>[],
	transaction?: Transaction,
) =>
	db.categoryTags
		.count({
			where: { campaignId: campaignId },
			transaction,
		})
		.then((toDestroy) => {
			if (toDestroy > 0) {
				return db.categoryTags.destroy({ where: { campaignId: campaignId }, transaction });
			} else {
				return;
			}
		})
		.then(() =>
			db.categoryTags.bulkCreate(
				tags.map((t) => ({ ...t, campaignId: campaignId })),
				{
					fields: ['campaignId', 'contents', 'showOrder'],
					transaction,
				},
			),
		);

export const updateCampaignImages = async (
	campaignId: number,
	images: Express.Multer.File[],
	imageDetails: imageUpdateType[],
	transaction?: Transaction,
) => {
	let toRemove: CategoryImage[] = [];
	const toAdd: CreationAttributes<CategoryImage>[] = [];
	const toChange: { categoryImageId: number; showOrder: number }[] = [];
	const imagesInDB = await db.categoryImages.findAll({ where: { campaignId: campaignId }, transaction });
	for (const pD of imageDetails) {
		const picInDB = imagesInDB.find((pI: CategoryImage) => pI.picUrl == pD.originalName);
		if (picInDB == undefined) {
			const picFile = images.find((p) => p.originalname == pD.originalName)?.filename;
			toAdd.push({
				campaignId: campaignId,
				picUrl: picFile ? picFile : pD.originalName,
				showOrder: pD.showOrder,
			});
		} else if (picInDB != undefined && picInDB.showOrder != pD.showOrder) {
			toChange.push({ categoryImageId: picInDB.categoryImageId, showOrder: pD.showOrder });
		}
	}
	toRemove = imagesInDB.filter((pI: CategoryImage) => imageDetails.every((pD) => pD.originalName != pI.picUrl));
	if (toRemove.length > 0) {
		//remove files and db rows
		await removeCategoryImageFiles(toRemove.map((pI) => pI.picUrl));
		await removeCategoryImages(
			toRemove.map((pI) => pI.categoryImageId),
			transaction,
		);
	}
	if (toChange.length > 0) {
		await changeCategoryImageOrders(toChange, transaction);
	}
	if (toAdd.length > 0) {
		await addCampaignImages(toAdd, transaction);
	}
	return;
};

export const addCampaignImages = async (images: CreationAttributes<CategoryImage>[], transaction?: Transaction) =>
	db.categoryImages.bulkCreate(images, {
		fields: ['campaignId', 'showOrder', 'picUrl'],
		transaction,
	});

export const browseCampaigns = async (
	pagination: paginationParams,
	campaignWhere?: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const campaignCount = await db.campaigns.count({
		where: campaignWhere,
	});
	if (campaignCount > 0) {
		const campaigns = await db.campaigns
			.findAll({
				where: campaignWhere,
				include: [
					{
						separate: true,
						association: db.campaigns.associations.categoryAreas,
						attributes: { exclude: ['categoryAreaId', 'campaignId', 'categoryId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryDetails,
						attributes: { exclude: ['categoryDetailId', 'campaignId', 'categoryId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryImages,
						attributes: { exclude: ['categoryImageId', 'campaignId', 'categoryId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryTags,
						attributes: { exclude: ['categoryTagId', 'campaignId', 'categoryId'] },
						order: [[col('showOrder'), 'asc']],
					},
				],
				limit: pagination.pp,
				offset: (pagination.p - 1) * pagination.pp,
				order: [[col(pagination.sortKey), pagination.sort]],
				transaction,
			})
			.then((cs) => cs.map((c) => c.toJSON()));
		const campaignsAggregated = await db.campaigns
			.findAll({
				where: campaignWhere,
				attributes: {
					include: [
						[fn('MIN', col('occurrences.startAt')), 'start'],
						[fn('MAX', col('occurrences.endAt')), 'end'],
						[cast(fn('IFNULL', fn('SUM', col('occurrences.maxAttendee')), 0), 'signed'), 'maxCapacity'],
						[cast(fn('IFNULL', fn('SUM', col('occurrences.registrations.expected')), 0), 'signed'), 'sumExpected'],
					],
				},
				include: [
					{
						model: db.occurrences,
						attributes: [],
						include: [
							{
								association: db.occurrences.associations.registrations,
								attributes: [],
							},
						],
					},
				],
				group: [col('campaignId')],
			})
			.then((cs) => cs.map((c) => c.toJSON()));
		const rows = campaigns.map((c) => {
			const curC = campaignsAggregated.find((cA) => c.campaignId == cA.campaignId);
			if (curC) {
				return { ...c, ...curC };
			} else {
				return c;
			}
		});
		return { count: campaignCount, rows: rows };
	} else {
		return { rows: [], count: 0 };
	}
};

export const listCampaignsBare = async (
	include?: IncludeOptions | IncludeOptions[],
	paranoid = false,
	transaction?: Transaction,
) =>
	db.campaigns.findAll({
		attributes: ['campaignId', 'title'],
		include: include,
		order: [['showOrder', 'asc']],
		paranoid: paranoid,
		transaction,
	});

export const updateCampaign = async (
	campaignId: number,
	params: CreationAttributes<Campaign>,
	transaction?: Transaction,
) => {
	const campaign = await db.campaigns.findByPk(campaignId, {
		include: {
			association: db.campaigns.associations.occurrences,
			attributes: ['occurrenceId'],
		},
	});

	if (campaign == null) {
		throw new AppError(SYSTEM_ERROR, 'category does not exist', false);
	}

	if (
		params?.startRegistration !== campaign?.startRegistration ||
		params?.endRegistration !== campaign?.endRegistration
	) {
		await db.occurrences.update(
			{
				startAt: params?.startRegistration,
				endAt: params?.endRegistration,
				startDate: params?.startRegistration,
			},
			{
				where: {
					campaignId: campaignId,
				},
				transaction,
			},
		);
	}

	return db.campaigns.update(
		{
			title: params.title,
			sub: params.sub,
			description: params.description,
			campaignText: params.campaignText,
			location: params.location,
			showOrder: params.showOrder,
			isDisplayed: params.isDisplayed,

			startRegistration: params.startRegistration,
			endRegistration: params.endRegistration,
			presentIssueTiming: params.presentIssueTiming,

			isMultipleWinners: params?.isMultipleWinners,
			isRegisterMultipleTimes: params?.isRegisterMultipleTimes,
			isMultiEvent: params.isMultiEvent,
		},
		{
			where: { campaignId: campaignId },
			transaction,
		},
	);
};

//TODO: add start, end
export const detailCampaignMaster = async ({
	campaignId,
	isParanoid = true,
	occurrenceWhere,
	transaction,
	search,
}: {
	campaignId: number;
	isParanoid: boolean;
	occurrenceWhere: WhereAttributeHash;
	transaction?: Transaction;
	search: any;
}) =>
	Promise.all([
		db.campaigns
			.findByPk(campaignId, {
				paranoid: isParanoid,
				include: [
					{
						separate: true,
						association: db.campaigns.associations.categoryAreas,
						attributes: { exclude: ['categoryAreaId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryDetails,
						attributes: { exclude: ['categoryDetailId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryImages,
						attributes: { exclude: ['categoryImageId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryTags,
						attributes: { exclude: ['categoryTagId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
				],
				transaction,
			})
			.then((c) => c?.toJSON()),
		db.campaigns.findByPk(campaignId, {
			attributes: [
				[fn('MIN', col('occurrences.startAt')), 'start'],
				[fn('MAX', col('occurrences.endAt')), 'end'],
				[cast(fn('IFNULL', fn('SUM', col('occurrences.maxAttendee')), 0), 'signed'), 'maxCapacity'],
				[cast(fn('IFNULL', fn('SUM', col('occurrences.registrations.expected')), 0), 'signed'), 'sumExpected'],
			],
			include: {
				association: db.campaigns.associations.occurrences,
				required: false,
				attributes: [],
				include: [
					{
						association: db.occurrences.associations.registrations,
						required: false,
						attributes: [],
					},
				],
			},
			raw: true,
			nest: true,
			transaction,
		}),
	]).then(async ([categoryDetailed, categoryAggregated]) => {
		let start: any;
		let end: any;
		if (search && search.length === 2) {
			start = moment(search[0]);
			end = moment(search[1]);
		}

		const occurrences = await db.occurrences.findAll({
			where: {
				campaignId: campaignId,
				...(search && search.length === 2
					? {
							startDate: {
								[Op.gte]: start,
								[Op.lte]: end,
							},
					  }
					: {}),
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
					association: db.occurrences.associations.Campaign,
					attributes: [],
				},
			],
			group: [col('occurrenceId')],
			transaction,
			raw: true,
			nest: true,
			order: [['startAt', 'ASC']],
		});
		return {
			...categoryDetailed,
			...categoryAggregated,
			occurrences,
		};
	});
export const deleteCampaign = async (campaignId: number, transaction?: Transaction) => {
	await Promise.all([
		db.campaigns.destroy({ where: { campaignId: campaignId }, transaction }),
		db.categoryImages
			.findAll({ attributes: ['picUrl'], where: { campaignId: campaignId }, transaction })
			.then((categoryImages) => removeCategoryImageFiles(categoryImages.map((cI) => cI.picUrl))),
		db.occurrences.destroy({ where: { campaignId }, transaction }),
	]);
};
export const browseCampaignsMember = async ({
	pagination,
	memberId,
	campaignWhere,
	transaction,
}: {
	memberId?: number;
	pagination: paginationParams;
	campaignWhere?: WhereAttributeHash;
	transaction?: Transaction;
}) => {
	const campaignCount = await db.campaigns.count({
		where: campaignWhere,
	});
	if (campaignCount > 0) {
		const campaigns = await db.campaigns
			.findAll({
				attributes: { exclude: ['descrpition', 'location'] },
				where: campaignWhere,
				include: [
					{
						separate: true,
						association: db.campaigns.associations.categoryAreas,
						attributes: { exclude: ['categoryAreaId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryDetails,
						attributes: { exclude: ['categoryDetailId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryImages,
						attributes: { exclude: ['categoryImageId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryTags,
						attributes: { exclude: ['categoryTagId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						required: false,
						association: db.campaigns.associations.registrations,
						where: {
							memberId,
						},
						attributes: ['memberId'],
					},
				],
				limit: pagination.pp,
				offset: (pagination.p - 1) * pagination.pp,
				order: [[col(pagination.sortKey), pagination.sort]],
				transaction,
			})
			.then((cs) => cs.map((c) => c.toJSON()));
		return { count: campaignCount, rows: campaigns };
	} else {
		return { rows: [], count: 0 };
	}
};

export const detailCampaignMember = async (
	campaignWhere: WhereAttributeHash,
	isParanoid = true,
	occurrenceWhere: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const campaignInfo = await db.campaigns
		.findOne({
			where: campaignWhere,
			paranoid: isParanoid,
			include: [
				{
					separate: true,
					association: db.campaigns.associations.categoryAreas,
					attributes: { exclude: ['categoryAreaId', 'categoryId', 'campaignId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					separate: true,
					association: db.campaigns.associations.categoryDetails,
					attributes: { exclude: ['categoryDetailId', 'categoryId', 'campaignId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					separate: true,
					association: db.campaigns.associations.categoryImages,
					attributes: { exclude: ['categoryImageId', 'categoryId', 'campaignId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					separate: true,
					association: db.campaigns.associations.categoryTags,
					attributes: { exclude: ['categoryTagId', 'categoryId', 'campaignId'] },
					order: [[col('showOrder'), 'asc']],
				},
			],
			transaction,
		})
		.then((c) => c?.toJSON() ?? null);
	if (campaignInfo == null) {
		throw new AppError(SYSTEM_ERROR, `campaign ${campaignWhere.campaignId} does not exist`, false);
	} else if (campaignInfo.isDisplayed == false) {
		return { ...campaignInfo, occurrences: [] };
	}
	const occurrences = await db.occurrences
		.findAll({
			where: {
				[Op.or]: [{ ...occurrenceWhere }],
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
					association: db.occurrences.associations.Campaign,
					attributes: [],
				},
			],
			group: [col('occurrenceId')],
			order: [['startAt', 'ASC']],
			transaction,
		})
		.then((os) => os.map((o) => o.toJSON()));
	return { ...campaignInfo, occurrences };
};

export const listCampaignsTags = async (transaction?: Transaction) =>
	db.sequelize.query(
		`SELECT DISTINCT contents, showOrder FROM ${db.categoryTags.tableName} WHERE campaignId IS NOT NULL ORDER BY showOrder ASC;`,
		{ type: QueryTypes.SELECT, transaction },
	);
