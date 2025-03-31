import path = require('path');
import {
	Attributes,
	cast,
	col,
	CreationAttributes,
	fn,
	IncludeOptions,
	literal,
	Op,
	QueryTypes,
	Sequelize,
	Transaction,
	WhereAttributeHash,
} from 'sequelize';
import { systemConfig, SYSTEM_ERROR, BAD_REQUEST, SYSTEM_SETTING_KEYS } from '../config';
import { AppError, FileOps } from '../utilities';
import { db } from '../models';
import { Category } from '../models/categoryModel';
import { CategoryArea } from '../models/categoryAreaModel';
import { CategoryDetail } from '../models/categoryDetailModel';
import { CategoryImage } from '../models/categoryImageModel';
import { CategoryTag } from '../models/categoryTagModel';
import { Registration } from '../models/registrationModel';
import { CategoryCancelCondition } from '../models/categoryCancelConditions';
import moment from 'moment';
import { CategoryMessage } from '../models/categoryMessageModel';
import { CategoryMessageDetail } from '../models/categoryMessageDetail';

import type { BatchUpdateDisplayCategoriesSchema } from '../schemas/category';

export const statsOfTheDay = async (occurrenceWhere: WhereAttributeHash) => {
	const registrations = await db.registrations
		.findAll({
			attributes: {
				exclude: ['createdAt', 'updatedAt', 'deletedAt', 'isNotified1', 'isNotified2', 'attended', 'expected'],
				include: [
					[col('Occurrence.startAt'), 'startAt'],
					[col('`Category`.`isProgram`'), 'isProgram'],
				],
			},
			include: [
				{
					association: db.registrations.associations.Member,
					attributes: [
						'firstName',
						'lastName',
						'firstNameKana',
						'lastNameKana',
						'telephone',
						'isCampaign',
						'customerRegistrationId1',
						'customerRegistrationId2',
						'displayName',
					],
				},
				{
					association: db.registrations.associations.Occurrence,
					attributes: [],
					where: occurrenceWhere,
					required: true,
				},
				{
					association: db.registrations.associations.Category,
					attributes: [],
				},
			],
			raw: true,
			nest: true,
		})
		.then((regis) => {
			if (!Array.isArray(regis)) {
				regis = [regis];
			}
			return regis as unknown as (Attributes<Registration> & { startAt: Date })[];
		});
	const categorySums: {
		categoryId: number;
		sumExpected: number;
	}[] = [];
	registrations.forEach((r) => {
		if (r.categoryId && true) {
			const foundCategorySum = categorySums.find((categorySum) => categorySum.categoryId == r.categoryId);
			foundCategorySum == undefined
				? categorySums.push({ categoryId: r.categoryId, sumExpected: 1 })
				: foundCategorySum.sumExpected++;
		}
	});
	if (!categorySums.length) {
		return { registrations: registrations, categories: [] };
	}
	return { categories: categorySums, registrations };
};
export const createCategory = async (params: CreationAttributes<Category>, transaction?: Transaction) => {
	return db.categories
		.increment(
			{ showOrder: 1 },
			{
				where: { deletedAt: null },
				transaction,
			},
		)
		.then(() =>
			db.categories.create(
				{
					cancelDescription: params.cancelDescription,
					checkInEnabled: params.checkInEnabled,
					groupBooking: params.groupBooking,
					title: params.title,
					sub: params.sub,
					description: params.description,
					campaignText: params.campaignText,
					location: params.location,
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
					isSendImage: params.isSendImage,
					isProgram: params.isProgram,
					notRegisterEventSameTime: params.isMultiEvent ? params.notRegisterEventSameTime : false,
					isMultiEvent: params.isMultiEvent,
					type: params.type,
					fee: +(params.fee || 0),
					cancelable: params.cancelable,
					cancelConditions: params?.cancelConditions ? JSON.parse(params.cancelConditions as unknown as string) : [],
					isMessage: params.isMessage,
				} as CreationAttributes<Category>,
				{ transaction, include: [db.categoryCancelConditions] },
			),
		);
};
export const browseCategories = async (
	pagination: paginationParams,
	categoryWhere?: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const categoryCount = await db.categories.count({
		where: categoryWhere,
	});
	if (categoryCount > 0) {
		const categories = await db.categories
			.findAll({
				where: categoryWhere,
				include: [
					{
						separate: true,
						association: db.categories.associations.categoryAreas,
						attributes: { exclude: ['categoryAreaId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryDetails,
						attributes: { exclude: ['categoryDetailId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryImages,
						attributes: { exclude: ['categoryImageId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryTags,
						attributes: { exclude: ['categoryTagId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.occasions,
						attributes: [
							'categoryId',
							'occasionId',
							'fee',
							'title',
							'startDate',
							'startRegistration',
							'endDate',
							'endRegistration',
							'isMultiEvent',
							// 'maxCapacity',
							'showOrder',
							'cancelable',
							'isDisplayed',
							'isMessage',
							[
								Sequelize.literal(`CAST((
									SELECT SUM(\`maxAttendee\`) FROM occurrences
									WHERE \`occasionId\` = \`Occasion\`.\`occasionId\`
								) AS UNSIGNED)`),
								'maxCapacity',
							],
							[
								Sequelize.literal(`CAST((
									SELECT SUM(\`expected\`) FROM registrations
									WHERE \`occasionId\` = \`Occasion\`.\`occasionId\`
								) AS UNSIGNED)`),
								'sumExpected',
							],
							[
								Sequelize.literal(`CAST((
									SELECT COUNT(\`expected\`) FROM registrations
									WHERE \`occasionId\` = \`Occasion\`.\`occasionId\`
									AND attended IS TRUE
								) AS UNSIGNED)`),
								'sumAttended',
							],
						],
						order: [[col('showOrder'), 'asc']],
						include: [
							{
								association: db.occasions.associations.occasionImages,
								attributes: [
									//
									'picUrl',
									'showOrder',
								],
							},
						],
					},
				],
				limit: pagination.pp,
				offset: (pagination.p - 1) * pagination.pp,
				order: [[col(pagination.sortKey), pagination.sort]],
				transaction,
				attributes: {
					include: [
						[
							Sequelize.literal(`CAST((
								SELECT COUNT(\`categoryId\`)
								FROM registrations
								WHERE \`categoryId\` = \`Category\`.\`categoryId\`
								AND attended IS TRUE
							) AS UNSIGNED)`),
							'sumAttended',
						],
						[
							Sequelize.literal(`(
								CASE
									WHEN \`Category\`.\`isProgram\` = true THEN (
										SELECT COUNT(\`categoryId\`)
										FROM \`occasions\`
										WHERE 
											\`categoryId\` = \`Category\`.\`categoryId\`
									)
									ELSE null
								END
							)`),
							'countEventProgram',
						],
						[
							Sequelize.literal(`(
								SELECT MIN(\`startAt\`)
								FROM \`occurrences\`
								WHERE \`categoryId\` = \`Category\`.\`categoryId\`
							)`),
							'start',
						],
						[
							Sequelize.literal(`(
								SELECT MAX(\`endAt\`)
								FROM \`occurrences\`
								WHERE \`categoryId\` = \`Category\`.\`categoryId\`
							)`),
							'end',
						],
						[
							Sequelize.literal(`(
								SELECT CAST(COALESCE(SUM(\`maxAttendee\`), 0) AS SIGNED)
								FROM \`occurrences\`
								WHERE \`categoryId\` = \`Category\`.\`categoryId\`
							)`),
							'maxCapacity',
						],
						[
							Sequelize.literal(`(
								SELECT CAST(COALESCE(SUM(\`expected\`), 0) AS SIGNED)
								FROM \`registrations\`
								WHERE \`categoryId\` = \`Category\`.\`categoryId\`
							)`),
							'sumExpected',
						],
					],
				},
			})
			.then((cs) => cs.map((c) => c.toJSON()));
		const rows = categories;
		return { count: categoryCount, rows: rows };
	} else {
		return { rows: [], count: 0 };
	}
};

export const browseCategories_Member = async (
	pagination: paginationParams,
	categoryWhere?: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const { valueFlag: isEventBookingTabVisible } = (await db.systemSettings.findOne({
		where: {
			name: SYSTEM_SETTING_KEYS.IS_EVENT_BOOKING_TAB_VISIBLE,
		},
		attributes: ['valueFlag'],
		raw: true,
	})) || {
		isEventBookingTabVisible: true,
	};

	const categoryCount = !isEventBookingTabVisible
		? 0
		: await db.categories.count({
				where: categoryWhere,
		  });
	if (categoryCount > 0) {
		const categories = await db.categories
			.findAll({
				attributes: { exclude: ['descrpition', 'location'] },
				where: categoryWhere,
				include: [
					{
						separate: true,
						association: db.categories.associations.categoryAreas,
						attributes: { exclude: ['categoryAreaId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryDetails,
						attributes: { exclude: ['categoryDetailId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryImages,
						attributes: { exclude: ['categoryImageId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryTags,
						attributes: { exclude: ['categoryTagId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
				],
				limit: pagination.pp,
				offset: (pagination.p - 1) * pagination.pp,
				order: [[col(pagination.sortKey), pagination.sort]],
				transaction,
			})
			.then((cs) => cs.map((c) => c.toJSON()));
		return { count: categoryCount, rows: categories };
	} else {
		return { rows: [], count: 0 };
	}
};
export const listCategoriesBare = async (
	include?: IncludeOptions | IncludeOptions[],
	paranoid = false,
	transaction?: Transaction,
) =>
	db.categories.findAll({
		attributes: ['categoryId', 'title'],
		include: include,
		order: [['showOrder', 'asc']],
		paranoid: paranoid,
		transaction,
	});
export const listCategoriesAreas = async (transaction?: Transaction) =>
	db.sequelize.query(`SELECT DISTINCT contents, showOrder FROM ${db.categoryAreas.tableName} ORDER BY showOrder ASC;`, {
		type: QueryTypes.SELECT,
		transaction,
	});

export const listCategoriesTags = async (transaction?: Transaction) =>
	db.sequelize.query(
		`SELECT DISTINCT contents, showOrder FROM ${db.categoryTags.tableName} WHERE categoryId IS NOT NULL ORDER BY showOrder ASC;`,
		{ type: QueryTypes.SELECT, transaction },
	);

//TODO: add start, end
export const detailCategory_Master = async ({
	categoryId,
	isParanoid = true,
	occurrenceWhere,
	transaction,
	search,
}: {
	categoryId: number;
	isParanoid: boolean;
	occurrenceWhere: WhereAttributeHash;
	transaction?: Transaction;
	search: any;
	sortKey?: string;
}) =>
	Promise.all([
		db.categories
			.findByPk(categoryId, {
				paranoid: isParanoid,
				include: [
					{
						separate: true,
						association: db.categories.associations.categoryAreas,
						attributes: { exclude: ['categoryAreaId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryDetails,
						attributes: { exclude: ['categoryDetailId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryMessages,
						attributes: { exclude: ['categoryMessageId', 'categoryId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						association: db.categories.associations.categoryImages,
						attributes: { exclude: ['categoryImageId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						separate: true,
						model: db.categoryCancelConditions,
						attributes: { exclude: ['createdAt', 'categoryId', 'updatedAt', 'id'] },
					},
					{
						separate: true,
						association: db.categories.associations.categoryTags,
						attributes: { exclude: ['categoryTagId', 'categoryId', 'campaignId'] },
						order: [[col('showOrder'), 'asc']],
					},
					{
						model: db.categoryMessageDetails,
						attributes: { exclude: ['id', 'categoryId', 'occasionId'] },
					},
				],
				transaction,
				attributes: {
					include: [
						[
							Sequelize.literal(`(
								SELECT
									CAST(COALESCE(SUM(\`maxAttendee\`), 0) AS SIGNED)
								FROM
									occurrences
								WHERE
									\`categoryId\` = \`Category\`.\`categoryId\`
							)`),
							'maximumAttendees',
						],
						[
							Sequelize.literal(`(
								SELECT
									CASE
									WHEN \`Category\`.groupBooking IS TRUE THEN CAST(COALESCE(SUM(\`companionCount\` + \`participantCount\`), 0) AS SIGNED)
										ELSE CAST(COALESCE(COUNT(\`registrationId\`), 0) AS SIGNED)
									END
								FROM
									registrations
								WHERE
									\`categoryId\` = \`Category\`.\`categoryId\`
									AND \`cancelledAt\` IS NULL
							)`),
							'reservationCount',
						],
						[
							Sequelize.literal(`(
								SELECT
									CASE
										WHEN \`Category\`.groupBooking IS TRUE THEN CAST(COALESCE(SUM(\`actualCompanionCount\` + \`actualParticipantCount\`), 0) AS SIGNED)
										ELSE CAST(COALESCE(COUNT(\`registrationId\`), 0) AS SIGNED)
									END
								FROM
									registrations
								WHERE
									\`categoryId\` = \`Category\`.\`categoryId\`
								AND \`attended\` IS TRUE
							)`),
							'attendeeCount',
						],
					],
				},
			})
			.then((c) => c?.toJSON()),
		db.categories.findByPk(categoryId, {
			attributes: [
				[fn('MIN', col('occurrences.startAt')), 'start'],
				[fn('MAX', col('occurrences.endAt')), 'end'],
				[cast(fn('IFNULL', fn('SUM', col('occurrences.maxAttendee')), 0), 'signed'), 'maxCapacity'],
				[cast(fn('IFNULL', fn('SUM', col('occurrences.registrations.expected')), 0), 'signed'), 'sumExpected'],
			],
			include: {
				association: db.categories.associations.occurrences,
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
		// .then(c => c?.toJSON()),

		// .then(occus => occus.map(occu => {
		//     let o: any = occu.toJSON();
		//     delete o.registrations;
		//     return o;
		// }))
	]).then(async ([categoryDetailed, categoryAggregated]) => {
		let start: any;
		let end: any;
		if (search && search.length === 2) {
			start = moment(search[0]);
			end = moment(search[1]);
		}

		const sortKey = categoryDetailed?.isSettingTime ? 'startDate' : 'startAt';
		const isSettingTime = categoryDetailed?.isSettingTime;
		const isGroupBooking = categoryDetailed?.groupBooking;

		const occurrences = await db.occurrences.findAll({
			where: isSettingTime
				? {
						categoryId: categoryId,
						...(search && search.length === 2
							? {
									startDate: {
										[Op.gte]: start,
										[Op.lte]: end,
									},
							  }
							: {}),
				  }
				: { categoryId: categoryId, ...occurrenceWhere },
			attributes: {
				include: [
					[fn('DATE_FORMAT', literal('DATE_ADD(`Occurrence`.`startAt`, INTERVAL 9 HOUR)'), '%Y-%m-%d'), 'groupDate'],
					...((isGroupBooking
						? [
								[
									cast(
										fn(
											'IFNULL',
											Sequelize.literal(
												'SUM(`registrations`.`participantCount`) + SUM(`registrations`.`companionCount`)',
											),
											0,
										),
										'signed',
									),
									'sumExpected',
								],
								[
									cast(
										fn(
											'IFNULL',
											Sequelize.literal(
												'SUM(`registrations`.`actualParticipantCount`) + SUM(`registrations`.`actualCompanionCount`)',
											),
											0,
										),
										'signed',
									),
									'sumAttended',
								],
						  ]
						: [
								[cast(fn('IFNULL', fn('SUM', col('registrations.expected')), 0), 'signed'), 'sumExpected'],
								[cast(fn('IFNULL', fn('SUM', col('registrations.attended')), 0), 'signed'), 'sumAttended'],
						  ]) as any[]),
					[
						cast(fn('IFNULL', fn('SUM', col('registrations.actualCompanionCount')), 0), 'signed'),
						'sumActualCompanionCount',
					],
					[
						cast(fn('IFNULL', fn('SUM', col('registrations.actualParticipantCount')), 0), 'signed'),
						'sumActualParticipantCount',
					],
				],
				exclude: ['occasionId', 'createdAt', 'updatedAt', 'deletedAt'],
			},
			include: [
				{
					association: db.occurrences.associations.registrations,
					attributes: [],
				},
				{
					association: db.occurrences.associations.Category,
					attributes: [],
				},
			],
			group: [col('occurrenceId')],
			transaction,
			raw: true,
			nest: true,
			order: [
				//
				[Sequelize.literal(`\`Occurrence\`.\`${sortKey}\``), 'ASC'],
			],
		});

		const occurrencesTableView = await db.occurrences.findAll({
			where: isSettingTime
				? {
						categoryId: categoryId,
						...(search && search.length === 2
							? {
									startDate: {
										[Op.gte]: start,
										[Op.lte]: end,
									},
							  }
							: {}),
				  }
				: { categoryId: categoryId, ...occurrenceWhere },
			include: [
				{
					model: db.registrations,
					attributes: [],
				},
				{
					model: db.categories,
					attributes: [],
				},
			],
			attributes: {
				exclude: ['createdAt', 'updatedAt', 'deletedAt'],
				include: [
					...((isGroupBooking
						? [
								[
									Sequelize.literal(`(
										SELECT CAST(COALESCE(SUM(\`registrations\`.\`participantCount\`) + SUM(\`registrations\`.\`companionCount\`), 0) AS SIGNED)
										FROM \`registrations\`
										WHERE \`registrations\`.\`occurrenceId\` = \`Occurrence\`.\`occurrenceId\`
										AND \`registrations\`.\`cancelledAt\` IS NULL
									)`),
									'sumExpected',
								],
								[
									Sequelize.literal(`(
										SELECT CAST(COALESCE(SUM(\`registrations\`.\`actualParticipantCount\`) + SUM(\`registrations\`.\`actualCompanionCount\`), 0) AS SIGNED)
										FROM \`registrations\`
										WHERE \`registrations\`.\`occurrenceId\` = \`Occurrence\`.\`occurrenceId\`
										AND \`registrations\`.\`cancelledAt\` IS NULL
										AND \`registrations\`.\`attended\` IS TRUE
									)`),
									'sumAttended',
								],
						  ]
						: [
								[
									Sequelize.literal(`(
										SELECT CAST(COALESCE(SUM(\`registrations\`.\`expected\`), 0) AS SIGNED)
										FROM \`registrations\`
										WHERE \`registrations\`.\`occurrenceId\` = \`Occurrence\`.\`occurrenceId\`
										AND \`registrations\`.\`cancelledAt\` IS NULL
									)`),
									'sumExpected',
								],
								[
									Sequelize.literal(`(
										SELECT CAST(COALESCE(SUM(\`registrations\`.\`attended\`), 0) AS SIGNED)
										FROM \`registrations\`
										WHERE \`registrations\`.\`occurrenceId\` = \`Occurrence\`.\`occurrenceId\`
										AND \`registrations\`.\`cancelledAt\` IS NULL
										AND \`registrations\`.\`attended\` IS TRUE
									)`),
									'sumAttended',
								],
						  ]) as any[]),
					[
						Sequelize.literal(`(
							SELECT CAST(COALESCE(COUNT(\`registrations\`.\`registrationId\`), 0) AS SIGNED)
							FROM \`registrations\`
							WHERE \`registrations\`.\`occurrenceId\` = \`Occurrence\`.\`occurrenceId\`
							AND \`registrations\`.\`cancelledAt\` IS NOT NULL
						)`),
						'cancelCount',
					],
					[
						Sequelize.literal(`(
							SELECT CAST(COALESCE(SUM(\`transactions\`.\`amount\`), 0) AS SIGNED)
							FROM \`transactions\`
							JOIN \`registrations\` as \`Registration\` ON \`transactions\`.\`registration_id\` = \`Registration\`.\`registrationId\`
							WHERE \`transactions\`.\`status\` = 'FULFILLED'
							AND \`transactions\`.\`type\` = 'purchase'
							AND \`Registration\`.\`attended\` = 1
							AND \`Registration\`.\`occurrenceId\` = \`Occurrence\`.\`occurrenceId\`
						)`),
						'sales',
					],
					[Sequelize.literal('CAST(`Category`.`fee` as FLOAT)'), 'fee'],
				],
			},
			order: [
				//
				[Sequelize.literal(sortKey), 'ASC'],
			],
		});

		// let sumAttended = 0
		// occurrences.forEach((o) => {
		// 	sumAttended += categoryDetailed?.groupBooking
		// 		? (o?.sumActualCompanionCount ?? 0) + (o?.sumActualParticipantCount ?? 0)
		// 		: o?.sumAttended ?? 0
		// })

		return {
			...categoryDetailed,
			...categoryAggregated,
			occurrences,
			occurrencesTableView,
		};
	});

export const detailCategory_Member = async (
	categoryWhere: WhereAttributeHash,
	isParanoid = true,
	occurrenceWhere: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const categoryInfo = await db.categories
		.findOne({
			where: categoryWhere,
			paranoid: isParanoid,
			include: [
				{
					separate: true,
					association: db.categories.associations.categoryAreas,
					attributes: { exclude: ['categoryAreaId', 'categoryId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					separate: true,
					association: db.categories.associations.categoryDetails,
					attributes: { exclude: ['categoryDetailId', 'categoryId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					separate: true,
					association: db.categories.associations.categoryMessages,
					attributes: { exclude: ['categoryId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					separate: true,
					association: db.categories.associations.categoryImages,
					attributes: { exclude: ['categoryImageId', 'categoryId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					separate: true,
					association: db.categories.associations.categoryTags,
					attributes: { exclude: ['categoryTagId', 'categoryId'] },
					order: [[col('showOrder'), 'asc']],
				},
				{
					association: db.categories.associations.cancelConditions,
					attributes: ['name', 'day', 'hour', 'minute', 'refundPercentage'],
					separate: true,
					order: [[col('day'), 'asc']],
				},
			],
			transaction,
		})
		.then((c) => c?.toJSON() ?? null);

	if (categoryInfo == null) {
		throw new AppError(SYSTEM_ERROR, `category ${categoryWhere.categoryId} does not exist`, false);
	}
	const occurrences = await db.occurrences
		.findAll({
			where: {
				[Op.or]: [
					{ ...occurrenceWhere },
					{ '$Category.isSettingTime$': true, categoryId: occurrenceWhere?.categoryId },
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
					association: db.occurrences.associations.Category,
					attributes: [],
				},
			],
			group: [col('occurrenceId')],
			order: [[!categoryInfo?.isSettingTime ? 'startAt' : 'startDate', 'ASC']],
			transaction,
		})
		.then((os) => os.map((o) => o.toJSON()));
	return { ...categoryInfo, occurrences };
};

export const updateCategory = async (
	categoryId: number,
	params: CreationAttributes<Category> & {
		categoryMessageDetail: string;
	},
	transaction?: Transaction,
) => {
	const category = await db.categories.findByPk(categoryId, {
		raw: true,
		include: [
			{
				association: db.categories.associations.registrations,
				attributes: [],
				include: [
					{
						association: db.registrations.associations.Member,
						attributes: [],
					},
				],
			},
		],
		attributes: {
			include: [[Sequelize.col('registrations.Member.memberId'), 'memberId']],
		},
	});

	if (category == null) {
		throw new AppError(SYSTEM_ERROR, 'category does not exist', false);
	}
	const startRegistration = moment(category?.startRegistration);

	if (params.categoryMessageDetail && category?.isMessage) {
		const categoryMessageDetail = params.categoryMessageDetail
			? (JSON.parse(params.categoryMessageDetail) as CreationAttributes<CategoryMessageDetail>)
			: {};
		db.categoryMessageDetails.update({ ...categoryMessageDetail } as any, {
			where: { categoryId: category?.categoryId },
			transaction,
		});
	}

	if (params.cancelConditions) {
		const cancelConditions = params.cancelConditions
			? (JSON.parse(params.cancelConditions as unknown as string) as CreationAttributes<CategoryCancelCondition>[])
			: [];

		await db.categoryCancelConditions.destroy({
			where: { categoryId },
			transaction,
		});

		if (cancelConditions.length) {
			await db.categoryCancelConditions.bulkCreate(
				cancelConditions.map((condition) => ({
					...condition,
					categoryId,
				})),
				{
					transaction,
				},
			);
		}
	}

	if (category?.isSettingTime && params?.startDate !== category?.startDate && params?.endDate !== category?.endDate) {
		if (moment().isBefore(startRegistration)) {
			const startDate = moment(params?.startDate).format('YYYY-MM-DD');
			const endDate = moment(params?.endDate).format('YYYY-MM-DD');
			const dataCreateOccurrences = Array.from(new Array(moment(endDate).diff(moment(startDate), 'days') + 1)).map(
				(item, i) => ({
					maxAttendee: params?.numberOfPeople,
					startAt: params?.startDate,
					occurrenceId: null,
					endAt: params?.endDate,
					remarks: '',
					categoryId: category?.categoryId,
					startDate: moment(params?.startDate).add(i, 'days'),
					isSettingTime: category.isSettingTime,
					isDisplayed: params.isDisplayed,
					deletedAt: null,
				}),
			);
			await db.occurrences.destroy({
				where: {
					categoryId: category?.categoryId,
				},
				transaction,
			});

			await db.occurrences.bulkCreate(dataCreateOccurrences as any, {
				transaction,
			});
		} else if (params?.numberOfPeople !== category?.numberOfPeople) {
			await db.occurrences.update(
				{ maxAttendee: params?.numberOfPeople },
				{
					where: {
						categoryId: category?.categoryId,
					},
					transaction,
				},
			);
		} else {
			if (params?.startDate) {
				if (!moment(params?.startDate).isSame(moment(category?.startDate))) {
					throw new AppError(BAD_REQUEST, 'not update startDate', false);
				}
			}
			if (params?.endDate) {
				if (!moment(params?.endDate).isSame(moment(category?.endDate))) {
					throw new AppError(BAD_REQUEST, 'not update endDate', false);
				}
			}
		}
	}

	await db.categories.update(
		{
			cancelable: params.cancelable,
			cancelDescription: params.cancelDescription,
			fee: params.fee,
			title: params.title,
			sub: params.sub,
			description: params.description,
			campaignText: params.campaignText,
			location: params.location,
			showOrder: params.showOrder,
			isDisplayed: params.isDisplayed,
			checkInEnabled: params.checkInEnabled,
			groupBooking: params.groupBooking,
			...(category?.isSettingTime && moment().isBefore(startRegistration)
				? {
						startDate: params.startDate,
						endDate: params.endDate,
				  }
				: {}),
			...(category?.isSettingTime
				? {
						startRegistration: params.startRegistration,
						endRegistration: params.endRegistration,
						numberOfPeople: params.numberOfPeople,
				  }
				: {}),
			isSendImage: params.isSendImage,
			// isProgram: params.isProgram,
			notRegisterEventSameTime: params.notRegisterEventSameTime,
			isMultiEvent: params.isMultiEvent,
			type: params.type,
			isMessage: params.isMessage,
		},
		{
			where: { categoryId: categoryId },
			transaction,
		},
	);

	return category;
};

export const updateCategoryOrder = async (
	params: { categoryId: number; showOrder: number }[],
	transaction?: Transaction,
) =>
	db.categories
		.findAll({ where: { categoryId: { [Op.in]: params.map((p) => p.categoryId) } }, transaction })
		.then((categories) =>
			Promise.all(
				categories.map((c) => {
					const uc = params.find((p) => p.categoryId == c.categoryId);
					if (uc == undefined) {
						throw new Error(`uc not found ${c.categoryId}`);
					} else {
						return c.update({ showOrder: uc.showOrder }, { transaction });
					}
				}),
			),
		);

export const deleteCategory = async (categoryId: number, transaction?: Transaction) => {
	await Promise.all([
		db.categories.destroy({ where: { categoryId: categoryId }, transaction }),
		db.categoryImages
			.findAll({ attributes: ['picUrl'], where: { categoryId: categoryId }, transaction })
			.then((categoryImages) => removeCategoryImageFiles(categoryImages.map((cI) => cI.picUrl))),
		db.occurrences.destroy({ where: { categoryId }, transaction }),
	]);
};

export const updateCategoryAreas = async (
	categoryId: number,
	areas: CreationAttributes<CategoryArea>[],
	transaction?: Transaction,
) =>
	db.categoryAreas
		.count({
			where: { categoryId: categoryId },
			transaction,
		})
		.then((toDestroy) => {
			if (toDestroy > 0) {
				return db.categoryAreas.destroy({ where: { categoryId: categoryId }, transaction });
			} else {
				return;
			}
		})
		.then(() =>
			db.categoryAreas.bulkCreate(
				areas.map((t) => ({ ...t, categoryId: categoryId })),
				{
					fields: ['categoryId', 'contents', 'showOrder'],
					transaction,
				},
			),
		);
export const updateCategoryDetails = async (
	categoryId: number,
	details: CreationAttributes<CategoryDetail>[],
	transaction?: Transaction,
) =>
	db.categoryDetails
		.count({
			where: { categoryId: categoryId },
			transaction,
		})
		.then((toDestroy) => {
			if (toDestroy > 0) {
				return db.categoryDetails.destroy({ where: { categoryId: categoryId }, transaction });
			} else {
				return;
			}
		})
		.then(() =>
			db.categoryDetails.bulkCreate(
				details.map((d) => ({ ...d, categoryId: categoryId })),
				{
					fields: ['categoryId', 'label', 'value', 'showOrder'],
					transaction,
				},
			),
		);
export const updateCategoryMessages = async (
	categoryId: number,
	messages: CreationAttributes<CategoryMessage>[],
	transaction?: Transaction,
) =>
	db.categoryMessages
		.count({
			where: { categoryId: categoryId },
			transaction,
		})
		.then((toDestroy) => {
			if (toDestroy > 0) {
				return db.categoryMessages.destroy({ where: { categoryId: categoryId }, transaction });
			} else {
				return;
			}
		})
		.then(() =>
			db.categoryMessages.bulkCreate(
				messages.map((d) => ({ ...d, categoryId: categoryId })),
				{
					fields: ['categoryId', 'label', 'showOrder', 'required', 'option', 'type'],
					transaction,
				},
			),
		);

export const updateCategoryTags = async (
	categoryId: number,
	tags: CreationAttributes<CategoryTag>[],
	transaction?: Transaction,
) =>
	db.categoryTags
		.count({
			where: { categoryId: categoryId },
			transaction,
		})
		.then((toDestroy) => {
			if (toDestroy > 0) {
				return db.categoryTags.destroy({ where: { categoryId: categoryId }, transaction });
			} else {
				return;
			}
		})
		.then(() =>
			db.categoryTags.bulkCreate(
				tags.map((t) => ({ ...t, categoryId: categoryId })),
				{
					fields: ['categoryId', 'contents', 'showOrder'],
					transaction,
				},
			),
		);

export const updateCategoryImages = async (
	categoryId: number,
	images: Express.Multer.File[],
	imageDetails: imageUpdateType[],
	transaction?: Transaction,
) => {
	let toRemove: CategoryImage[] = [];
	const toAdd: CreationAttributes<CategoryImage>[] = [];
	const toChange: { categoryImageId: number; showOrder: number }[] = [];
	const imagesInDB = await db.categoryImages.findAll({ where: { categoryId: categoryId }, transaction });
	for (const pD of imageDetails) {
		const picInDB = imagesInDB.find((pI: CategoryImage) => pI.picUrl == pD.originalName);
		if (picInDB == undefined) {
			const picFile = images.find((p) => p.originalname == pD.originalName)?.filename;
			toAdd.push({
				categoryId: categoryId,
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
		await addCategoryImages(toAdd, transaction);
	}
	return;
};

export const addCategoryImages = async (images: CreationAttributes<CategoryImage>[], transaction?: Transaction) =>
	db.categoryImages.bulkCreate(images, {
		fields: ['categoryId', 'showOrder', 'picUrl'],
		transaction,
	});

// const removeCategoryImagesByCategoryId = async (categoryId: number | number[], transaction?: Transaction) =>
//     db.categoryImages.destroy({
//         where: { categoryId: categoryId },
//         transaction
//     });

export const removeCategoryImages = async (categoryImageId: number | number[], transaction?: Transaction) =>
	db.categoryImages.destroy({
		where: { categoryImageId: categoryImageId },
		transaction,
	});

export const removeCategoryImageFiles = async (picUrls: string[]) =>
	Promise.all(picUrls.map(async (pU) => FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_CATEGORY, pU))));

export const changeCategoryImageOrders = async (
	images: { categoryImageId: number; showOrder: number }[],
	transaction?: Transaction,
) =>
	Promise.all(
		images.map((i) =>
			db.categoryImages.update(
				{ showOrder: i.showOrder },
				{
					where: { categoryImageId: i.categoryImageId },
					transaction,
				},
			),
		),
	);

export const batchUpdateCategoriesHandler = async (
	data: BatchUpdateDisplayCategoriesSchema,
	transaction: Transaction,
) => {
	return await db.categories.update(
		{
			isDisplayed: data.isDisplayed,
		},
		{
			transaction,
			where: {
				isDisplayed: {
					[Op.not]: data.isDisplayed,
				},
			},
		},
	);
};
