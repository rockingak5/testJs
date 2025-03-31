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
	Sequelize,
	HasMany,
} from 'sequelize';
import { systemConfig, SYSTEM_ERROR, BAD_REQUEST } from '../config';
import { db } from '../models';
import { OccasionDetail } from '../models/occasionDetailModel';
import { OccasionImage } from '../models/occasionImageModel';
import { Occasion } from '../models/occasionModel';
import { AppError, FileOps } from '../utilities';
import moment from 'moment';
import { debug } from '../utilities/debug';
import { CategoryMessageDetail } from '../models/categoryMessageDetail';
import { isEmpty } from 'lodash';
import { categoryMessageDetailService } from '~services';

export const listOccasionsBare = async (
	include?: IncludeOptions | IncludeOptions[],
	isParanoid = true,
	isCampaign = false,
) =>
	db.occasions.findAll({
		where: isCampaign
			? {
					campaignId: {
						[Op.not]: null,
					},
			  }
			: {
					categoryId: {
						[Op.not]: null,
					},
			  },
		attributes: ['occasionId', isCampaign ? 'campaignId' : 'categoryId', 'title'],
		order: [['showOrder', 'asc']],
		include: include,
		paranoid: isParanoid,
	});

export const detailOccasion_Master = async ({
	occasionId,
	isParanoid = true,
	occurrenceWhere,
	transaction,
	search,
}: {
	occasionId: number;
	isParanoid: boolean;
	occurrenceWhere?: WhereAttributeHash;
	transaction?: Transaction;
	search: any;
}) => {
	const occasion = await db.occasions.findByPk(occasionId, {
		attributes: {
			include: [
				[fn('MAX', col('occurrences.startAt')), 'end'],
				[fn('MIN', col('occurrences.startAt')), 'start'],
				[cast(fn('SUM', col('occurrences.maxAttendee')), 'signed'), 'maxCapacity'],
				[cast(fn('IFNULL', fn('SUM', col('occurrences.registrations.expected')), 0), 'signed'), 'sumExpected'],
				[cast(fn('IFNULL', fn('SUM', col('occurrences.registrations.attended')), 0), 'signed'), 'sumAttended'],
				[
					Sequelize.literal(`(
						SELECT
							CAST(COALESCE(SUM(\`maxAttendee\`), 0) AS SIGNED)
						FROM
							occurrences
						WHERE
							\`Occasion\`.\`occasionId\` = \`occurrences\`.\`occasionId\`
					)`),
					'maximumAttendees',
				],
				[
					Sequelize.literal(`(
						SELECT
							CASE
							WHEN \`Occasion\`.\`groupBooking\` IS TRUE THEN CAST(COALESCE(SUM(\`companionCount\` + \`participantCount\`), 0) AS SIGNED)
								ELSE CAST(COALESCE(COUNT(\`registrationId\`), 0) AS SIGNED)
							END
						FROM
							registrations
						WHERE
							\`cancelledAt\` IS NULL
							AND \`Occasion\`.\`occasionId\` = \`registrations\`.\`occasionId\`
					)`),
					'reservationCount',
				],
				[
					Sequelize.literal(`(
						SELECT
							CASE
								WHEN \`Occasion\`.\`groupBooking\` IS TRUE THEN CAST(COALESCE(SUM(\`actualCompanionCount\` + \`actualParticipantCount\`), 0) AS SIGNED)
								ELSE CAST(COALESCE(COUNT(\`registrationId\`), 0) AS SIGNED)
							END
						FROM
							registrations
						WHERE
							\`attended\` IS TRUE
							AND \`Occasion\`.\`occasionId\` = \`registrations\`.\`occasionId\`
					)`),
					'attendeeCount',
				],
			],
			exclude: ['createdAt', 'updatedAt', 'deletedAt'],
		},
		include: [
			{
				separate: true,
				association: db.occasions.associations.cancelConditions,
				attributes: { exclude: ['createdAt', 'categoryId', 'updatedAt', 'id'] },
			},
			{
				association: db.occasions.associations.occurrences,
				attributes: [],
				include: [
					{
						association: db.occurrences.associations.registrations,
						attributes: [],
					},
				],
			},
		],
		paranoid: isParanoid,
		transaction,
		group: ['occasionId'],
	});
	if (occasion == null) {
		throw new AppError(SYSTEM_ERROR, `occasion ${occasionId} does not exist`, false);
	}
	const occasionInfo = await db.occasions.findByPk(occasionId, {
		attributes: ['occasionId'],
		include: [
			{
				association: db.occasions.associations.occasionDetails,
				attributes: { exclude: ['occasionDetailId', 'occasionId'] },
			},
			{
				association: db.occasions.associations.occasionImages,
				attributes: { exclude: ['occasionImageId', 'occasionId'] },
			},
			{
				model: db.categoryMessageDetails,
				attributes: { exclude: ['id', 'categoryId', 'occasionId'] },
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

	const sortKey = occasion?.isSettingTime ? 'startDate' : 'startAt';
	const isGroupBooking = occasion?.groupBooking;

	const occurrences = await db.occurrences
		.findAll({
			where: occasion?.isSettingTime
				? {
						occasionId: occasion.occasionId,
						...(search && search.length === 2
							? {
									startDate: {
										[Op.gte]: start,
										[Op.lte]: end,
									},
							  }
							: {}),
				  }
				: { occasionId: occasion.occasionId, ...occurrenceWhere },
			attributes: {
				include: [
					[fn('DATE_FORMAT', literal('DATE_ADD(`startAt`, INTERVAL 9 HOUR)'), '%Y-%m-%d'), 'groupDate'],
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
				],
				exclude: ['occasionId', 'createdAt', 'updatedAt', 'deletedAt'],
			},
			include: {
				association: db.occurrences.associations.registrations,
				attributes: [],
			},
			group: [col('occurrenceId')],
			transaction,
			order: [[sortKey, 'ASC']],
		})
		.then((occus) =>
			occus.map((occu) => {
				const o: any = occu.toJSON();
				delete o.registrations;
				return o;
			}),
		);

	const occurrencesTableView = await db.occurrences.findAll({
		where: occasion?.isSettingTime
			? {
					occasionId: occasion.occasionId,
					...(search && search.length === 2
						? {
								startDate: {
									[Op.gte]: start,
									[Op.lte]: end,
								},
						  }
						: {}),
			  }
			: { occasionId: occasion.occasionId, ...occurrenceWhere },
		include: [
			{
				model: db.registrations,
				attributes: [],
			},
			{
				model: db.occasions,
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
				[Sequelize.literal('CAST(`Occasion`.`fee` as FLOAT)'), 'fee'],
			],
		},
		order: [
			//
			[Sequelize.literal(sortKey), 'ASC'],
		],
	});

	return { ...occasion.toJSON(), ...occasionInfo?.toJSON(), occurrences, occurrencesTableView };
};
export const detailOccasion_Member = async (
	occasionWhere?: WhereAttributeHash,
	occurrenceWhere?: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const occasionInfo = await db.occasions
		.findOne({
			where: occasionWhere,
			attributes: {
				exclude: ['isDisplayed', 'showOrder', 'createdAt', 'updatedAt', 'deletedAt'],
			},
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
				{
					separate: true,
					association: db.occasions.associations.cancelConditions,
				},
				{
					separate: true,
					order: [['showOrder', 'ASC']],
					association: new HasMany(db.occasions, db.categoryMessages, {
						foreignKey: 'categoryId',
						as: 'formMessages',
					}),
					on: Sequelize.literal('`formMessages`.`categoryId` = `Occasion`.`categoryId`'),
					attributes: [
						//
						'label',
						'type',
						'option',
						'required',
					],
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
export const browseOccasions_Master = async (
	categoryId: number,
	pagination: paginationParams,
	transaction?: Transaction,
) => {
	const occasionCount = await db.occasions.findAll({
		attributes: ['occasionId'],
		where: { categoryId: categoryId },
		limit: pagination.pp,
		offset: (pagination.p - 1) * pagination.pp,
		transaction,
	});
	const occasionIds = occasionCount.map((o) => o.occasionId);
	if (occasionIds.length > 0) {
		const rows = await Promise.all([
			db.occasions
				.findAll({
					where: { categoryId: categoryId, occasionId: { [Op.in]: occasionIds } },
					attributes: {
						include: [
							[fn('MIN', col('occurrences.startAt')), 'start'],
							[fn('MAX', col('occurrences.startAt')), 'end'],
							[cast(fn('IFNULL', fn('SUM', col('occurrences.maxAttendee')), 0), 'signed'), 'maxCapacity'],
							[cast(fn('IFNULL', fn('SUM', col('occurrences.registrations.expected')), 0), 'signed'), 'sumExpected'],
						],
					},
					include: {
						association: db.occasions.associations.occurrences,
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
					group: ['occasionId'],
					order: [
						[col(pagination.sortKey), pagination.sort],
						[literal('end'), 'DESC'],
					],
					transaction,
				})
				.then((os) => os.map((o) => o.toJSON())),
			db.occasions
				.findAll({
					where: { categoryId: categoryId, occasionId: { [Op.in]: occasionIds } },
					include: [
						{
							separate: true,
							association: db.occasions.associations.occasionDetails,
							attributes: { exclude: ['occasionDetailId', 'occasionId'] },
							order: [['showOrder', 'asc']],
						},
						{
							separate: true,
							association: db.occasions.associations.occasionImages,
							attributes: { exclude: ['occasionImageId', 'occasionId'] },
							order: [['showOrder', 'asc']],
						},
					],
					order: [[col('occasionId'), 'asc']],
					limit: pagination.pp,
					transaction,
				})
				.then((os) => os.map((o) => o.toJSON())),
		]).then(([occasionsAggregated, occasionData]) =>
			occasionsAggregated.map((oA) => {
				const curOcca = occasionData.find((o) => o.occasionId == oA.occasionId);
				return curOcca ? { ...oA, ...curOcca } : { ...oA };
			}),
		);

		const overview = await db.categories.findOne({
			where: { categoryId },
			include: [
				{
					model: db.categoryImages,
				},
				{
					model: db.occasions,
					attributes: {
						include: [
							//
							[Sequelize.literal('CAST(`occasions`.`fee` AS FLOAT)'), 'fee'],
						],
					},
					include: [
						{
							// separate: true,
							model: db.occurrences,
							// order: [['startAt', 'ASC']],
							// include: [
							// 	{
							// 		model: db.registrations,
							// 		attributes: []
							// 	}
							// ],
							attributes: {
								exclude: ['createdAt', 'updatedAt', 'deletedAt'],
								include: [
									[
										Sequelize.literal(`(
												SELECT CAST(COALESCE(SUM(\`registrations\`.\`expected\`), 0) AS SIGNED)
												FROM \`registrations\`
												WHERE \`registrations\`.\`occurrenceId\` = \`occasions->occurrences\`.\`occurrenceId\`
											)`),
										'sumExpected',
									],
									[
										Sequelize.literal(`(
												SELECT CAST(COALESCE(SUM(\`registrations\`.\`attended\`), 0) AS SIGNED)
												FROM \`registrations\`
												WHERE \`registrations\`.\`occurrenceId\` = \`occasions->occurrences\`.\`occurrenceId\`
											)`),
										'sumAttended',
									],
									[
										Sequelize.literal(`(
												SELECT CAST(COALESCE(COUNT(\`registrations\`.\`registrationId\`), 0) AS SIGNED)
												FROM \`registrations\`
												WHERE \`registrations\`.\`occurrenceId\` = \`occasions->occurrences\`.\`occurrenceId\`
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
												AND \`Registration\`.\`occurrenceId\` = \`occasions->occurrences\`.\`occurrenceId\`
											)`),
										'sales',
									],
									[Sequelize.literal('CAST(`occasions`.`fee` as FLOAT)'), 'fee'],
								],
							},
						},
					],
				},
			],
		});

		return { count: occasionIds.length, rows: rows, overview };
	} else {
		return { rows: [], count: 0 };
	}
};
export const browseOccasionsMaster = async (
	campaignId: number,
	pagination: paginationParams,
	transaction?: Transaction,
) => {
	const occasionCount = await db.occasions.findAll({
		attributes: ['occasionId'],
		where: { campaignId: campaignId },
		limit: pagination.pp,
		offset: (pagination.p - 1) * pagination.pp,
		transaction,
	});
	const occasionIds = occasionCount.map((o) => o.occasionId);
	if (occasionIds.length > 0) {
		const rows = await Promise.all([
			db.occasions
				.findAll({
					where: { campaignId: campaignId, occasionId: { [Op.in]: occasionIds } },
					attributes: {
						include: [
							[fn('MIN', col('occurrences.startAt')), 'start'],
							[fn('MAX', col('occurrences.startAt')), 'end'],
							[cast(fn('IFNULL', fn('SUM', col('occurrences.maxAttendee')), 0), 'signed'), 'maxCapacity'],
							[cast(fn('IFNULL', fn('SUM', col('occurrences.registrations.expected')), 0), 'signed'), 'sumExpected'],
						],
					},
					include: {
						association: db.occasions.associations.occurrences,
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
					group: ['occasionId'],
					order: [
						[col(pagination.sortKey), pagination.sort],
						[literal('end'), 'DESC'],
					],
					transaction,
				})
				.then((os) => os.map((o) => o.toJSON())),
			db.occasions
				.findAll({
					where: { campaignId: campaignId, occasionId: { [Op.in]: occasionIds } },
					include: [
						{
							separate: true,
							association: db.occasions.associations.occasionDetails,
							attributes: { exclude: ['occasionDetailId', 'occasionId'] },
							order: [['showOrder', 'asc']],
						},
						{
							separate: true,
							association: db.occasions.associations.occasionImages,
							attributes: { exclude: ['occasionImageId', 'occasionId'] },
							order: [['showOrder', 'asc']],
						},
					],
					order: [[col('occasionId'), 'asc']],
					limit: pagination.pp,
					transaction,
				})
				.then((os) => os.map((o) => o.toJSON())),
		]).then(([occasionsAggregated, occasionData]) =>
			occasionsAggregated.map((oA) => {
				const curOcca = occasionData.find((o) => o.occasionId == oA.occasionId);
				return curOcca ? { ...oA, ...curOcca } : { ...oA };
			}),
		);
		return { count: occasionIds.length, rows: rows };
	} else {
		return { rows: [], count: 0 };
	}
};
export const browseOccasions_Member = async (
	categoryId: number,
	pagination: paginationParams,
	occasionWhere?: WhereAttributeHash,
	occurrenceWhere?: WhereAttributeHash,
	transaction?: Transaction,
) => {
	const occasionCount = await db.occasions.findAll({
		attributes: ['occasionId'],
		where: { categoryId: categoryId, isDisplayed: true },
		limit: pagination.pp,
		offset: (pagination.p - 1) * pagination.pp,
		transaction,
	});
	const occasionIds = occasionCount.map((o) => o.occasionId);
	if (occasionIds.length > 0) {
		const rows = await db.occasions
			.findAll({
				where: { categoryId: categoryId, occasionId: { [Op.in]: occasionIds }, ...occasionWhere },
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
					{
						association: db.occasions.associations.occurrences,
						where: occurrenceWhere,
						required: false,
						attributes: [],
					},
				],
				order: [[col(pagination.sortKey), pagination.sort]],
				limit: pagination.pp,
				transaction,
			})
			.then((os) => os.map((o) => o.toJSON()));
		return { count: occasionIds.length, rows: rows };
	} else {
		return { rows: [], count: 0 };
	}
};
export const createOccasion = async (params: CreationAttributes<Occasion>, transaction?: Transaction) => {
	return db.occasions
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
					groupBooking: params.groupBooking,

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
					fee: +(params.fee || 0),
					cancelable: params.cancelable,
					cancelDescription: params.cancelDescription,
					cancelConditions: (params as any)?.cancelConditions
						? JSON.parse((params as any).cancelConditions as unknown as string)
						: [],
					isMessage: params.isMessage,
				},
				{ transaction, include: [db.occasionCancelConditions] },
			),
		);
};
export const createCampaignOccasion = async (params: CreationAttributes<Occasion>, transaction?: Transaction) =>
	db.occasions
		.increment(
			{ showOrder: 1 },
			{
				where: { campaignId: params.campaignId },
				transaction,
			},
		)
		.then(() =>
			db.occasions.create(
				{
					campaignId: params.campaignId,
					title: params.title,
					description: params.description,
					canOverlap: params.canOverlap,
					isDisplayed: params.isDisplayed,
				},
				{ transaction },
			),
		);
export const updateOccasion = async (
	occasionId: number,
	params: CreationAttributes<Occasion> & {
		categoryMessageDetail: string;
	},
	transaction?: Transaction,
) => {
	const occasions = await db.occasions.findByPk(occasionId, {
		raw: true,
		include: {
			model: db.categories,
			attributes: [],
			include: [
				{
					model: db.registrations,
					attributes: [],
					include: [
						{
							model: db.members,
							attributes: [],
						},
					],
				},
			],
		},
		attributes: {
			include: [[Sequelize.col('Category.registrations.Member.memberId'), 'memberId']],
		},
	});

	if (occasions == null) {
		throw new AppError(SYSTEM_ERROR, 'occasions does not exist', false);
	}

	if (params.cancelConditions) {
		const cancelConditions = params.cancelConditions ? JSON.parse(params.cancelConditions as unknown as string) : [];

		await db.occasionCancelConditions.destroy({
			where: { occasionId },
			transaction,
		});

		if (cancelConditions.length) {
			await db.occasionCancelConditions.bulkCreate(
				cancelConditions.map((condition: any) => ({
					...condition,
					occasionId,
				})),
				{
					transaction,
				},
			);
		}
	}

	if (params?.isMessage && !isEmpty(params.categoryMessageDetail)) {
		const occasionId = occasions.occasionId;
		const categoryMessageDetail = params.categoryMessageDetail
			? (JSON.parse(params.categoryMessageDetail) as CreationAttributes<CategoryMessageDetail>)
			: {};
		const currentCategoryMessageDetail = await categoryMessageDetailService.getCategoryMessageDetail(
			{ occasionId },
			transaction,
		);
		if (currentCategoryMessageDetail) {
			await categoryMessageDetailService.updateCategoryMessageDetails(
				{ occasionId },
				{ ...categoryMessageDetail },
				transaction,
			);
		} else {
			await categoryMessageDetailService.createCategoryMessageDetails(
				{ occasionId, ...categoryMessageDetail },
				transaction,
			);
		}
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

	await db.occasions.update(
		{
			title: params.title,
			description: params.description,
			canOverlap: params.canOverlap,
			isDisplayed: params.isDisplayed,
			cancelable: params.cancelable,
			cancelDescription: params.cancelDescription,
			fee: params.fee,
			groupBooking: params.groupBooking,

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
			isMessage: params.isMessage,
		},
		{
			where: { occasionId: occasionId },
			transaction,
		},
	);

	return occasions;
};
export const updateCampaignOccasion = async (
	occasionId: number,
	params: CreationAttributes<Occasion>,
	transaction?: Transaction,
) => {
	const occasions = await db.occasions.findByPk(occasionId);

	if (occasions == null) {
		throw new AppError(SYSTEM_ERROR, 'occasions does not exist', false);
	}

	return db.occasions.update(
		{
			title: params.title,
			description: params.description,
			canOverlap: params.canOverlap,
			isDisplayed: params.isDisplayed,
		},
		{
			where: { occasionId: occasionId },
			transaction,
		},
	);
};

export const updateOccasionOrder = async (
	params: { occasionId: number; showOrder: number }[],
	transaction?: Transaction,
) =>
	db.occasions
		.findAll({ where: { occasionId: { [Op.in]: params.map((p) => p.occasionId) } }, transaction })
		.then((occasions) =>
			Promise.all(
				occasions.map((o) => {
					const uo = params.find((p) => p.occasionId == o.occasionId);
					if (uo == undefined) {
						throw new Error(`uo not found ${o.occasionId}`);
					} else {
						return o.update({ showOrder: uo.showOrder }, { transaction });
					}
				}),
			),
		);
export const updateOccasionDetails = async (
	occasionId: number,
	details: CreationAttributes<OccasionDetail>[],
	transaction?: Transaction,
) =>
	db.occasionDetails
		.destroy({
			where: { occasionId: occasionId },
			transaction,
		})
		.then(() =>
			db.occasionDetails.bulkCreate(
				details.map((d) => ({ ...d, occasionId: occasionId })),
				{
					fields: ['occasionId', 'label', 'value', 'showOrder'],
					transaction,
				},
			),
		);

export const updateOccasionImages = async (
	occasionId: number,
	images: Express.Multer.File[],
	imageDetails: imageUpdateType[],
	transaction?: Transaction,
) => {
	let toRemove: OccasionImage[] = [];
	const toAdd: CreationAttributes<OccasionImage>[] = [];
	const toChange: { occasionImageId: number; showOrder: number }[] = [];
	const imagesInDB = await db.occasionImages.findAll({ where: { occasionId: occasionId }, transaction });
	for (const pD of imageDetails) {
		const picInDB = imagesInDB.find((pI: OccasionImage) => pI.picUrl == pD.originalName);
		if (picInDB == undefined) {
			const picFile = images.find((p) => p.originalname == pD.originalName)?.filename;
			toAdd.push({
				occasionId: occasionId,
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

export const deleteOccasion = async (occasionId: number, transaction?: Transaction) =>
	Promise.all([
		db.occasions.destroy({ where: { occasionId }, transaction }),
		db.occurrences.destroy({ where: { occasionId }, force: true, transaction }),
		db.occasionImages
			.findAll({ attributes: ['picUrl'], where: { occasionId }, transaction })
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
	db.gifts
		.findAll({
			attributes: ['giftId'],
			where: { campaignId: campaignId },
			include: { separate: true, association: db.gifts.associations.occasionImages, attributes: ['picUrl'] },
			transaction,
		})
		.then((gifts) => {
			const picUrls: string[] = [];
			const giftIds: number[] = [];
			gifts.forEach((o) => {
				giftIds.push(o.giftId);
				if (o.occasionImages) {
					o.occasionImages.forEach((oI) => picUrls.push(oI.picUrl));
				}
			});
			return Promise.all([
				db.occasionImages.destroy({ where: { occasionId: { [Op.in]: giftIds } } }),
				db.gifts.destroy({ where: { campaignId: campaignId }, transaction }),
				removeOccasionImageFiles(picUrls),
			]);
		});

const addOccasionImages = async (images: CreationAttributes<OccasionImage>[], transaction?: Transaction) =>
	db.occasionImages.bulkCreate(images, {
		fields: ['occasionId', 'showOrder', 'picUrl'],
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
