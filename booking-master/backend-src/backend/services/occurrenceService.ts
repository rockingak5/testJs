import moment = require('moment');
import { cast, col, fn, HasOne, Op, Sequelize, Transaction, WhereAttributeHash } from 'sequelize';
import { SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { AppError } from '../utilities';
import { isEmpty } from 'lodash';
import { redisCacheService } from '~services/redisCacheService';

export const occurrenceDetail = async (occurrenceId: number, transaction?: Transaction) => {
	const occurrence = await db.occurrences.findByPk(occurrenceId, {
		attributes: {
			exclude: ['createdAt', 'updatedAt', 'deletedAt'],
		},
		include: [
			{
				association: db.occurrences.associations.registrations,
				attributes: {
					exclude: ['isRegistered', 'isFriends', 'isNotified1', 'isNotified2', 'updatedAt', 'deletedAt'],
					include: [
						[Sequelize.literal('`registrations->Transaction`.`order_id`'), 'paymentOrderId'],
						[Sequelize.literal('`registrations->Transaction`.`amount`'), 'paymentAmount'],
						[Sequelize.literal('`registrations->Transaction`.`status`'), 'paymentStatus'],
						[Sequelize.literal('`registrations->Transaction`.`type`'), 'paymentType'],
					],
				},
				include: [
					{
						association: db.registrations.associations.Member,
						attributes: [
							'customerRegistrationId1',
							'customerRegistrationId2',
							'memberId',
							'memberCode',
							'displayName',
							'picUrl',
							'memberSince',
							'curRM',
							'isCampaign',
							'candidateAt',
							'isRegistered',
							'isFriends',
							'unreadCount',
							'createdAt',
							'updatedAt',
							'building',
							'address',
							'postalCode',
							'telephone',
							'email',
							'lastNameKana',
							'firstNameKana',
							'lastName',
							'firstName',
						],
						include: [
							{
								separate: true,
								association: db.members.associations.campaignAnswers,
								attributes: { exclude: ['memberId', 'campaignQuestionId'] },
							},
						],
						required: false,
					},
					{
						attributes: [],
						association: new HasOne(db.registrations, db.transaction, {
							foreignKey: 'occurrenceId',
						}),
						where: {
							status: 'FULFILLED',
							type: 'purchase',
						},
						required: false,
						on: Sequelize.literal(
							'`registrations`.`occurrenceId` = `registrations->Transaction`.`occurrence_id` AND `registrations`.`memberId` = `registrations->Transaction`.member_id',
						),
					},
				],
			},
			{
				association: db.occurrences.associations.Category,
				attributes: ['groupBooking', 'fee'],
			},
			{
				association: db.occurrences.associations.Occasion,
				attributes: ['groupBooking', 'fee'],
			},
		],
		order: [[db.registrations, 'registrationId', 'asc']],
		transaction,
	});
	if (occurrence == null) {
		throw new AppError(SYSTEM_ERROR, `occurrence ${occurrenceId} does not exist`, false);
	}
	const occuDetails = {
		sumExpected: 0,
		sumAttended: 0,
	};
	occurrence.registrations?.forEach((r) => {
		occuDetails.sumExpected += r.expected ?? 0;
		occuDetails.sumAttended +=
			occurrence?.Category?.groupBooking || occurrence?.Occasion?.groupBooking
				? (r.actualCompanionCount ?? 0) + (r.actualParticipantCount ?? 0)
				: r.attended ?? 0;
	});
	const cancels = await db.registrations.findAll({
		where: {
			occurrenceId: occurrenceId,
			cancelledAt: { [Op.not]: null },
		},
		attributes: {
			exclude: ['isRegistered', 'isFriends', 'isNotified1', 'isNotified2', 'createdAt', 'updatedAt', 'deletedAt'],
		},
		include: [
			{
				association: db.registrations.associations.Member,
				attributes: {
					exclude: ['lineId'],
					include: [
						//
						'customerRegistrationId1',
						'customerRegistrationId2',
					],
				},
				include: [
					{
						separate: true,
						association: db.members.associations.campaignAnswers,
						attributes: { exclude: ['memberId', 'campaignQuestionId'] },
					},
				],
				required: false,
			},
		],
		order: [['registrationId', 'asc']],
		paranoid: false,
		transaction,
	});
	return { ...occuDetails, ...occurrence.toJSON(), cancels };
};

export const editOccurrences = async (
	categoryId: number | null,
	occasionId: number | null,
	occurrenceData: {
		maxAttendee: number;
		startAt: string;
		endAt: string;
		remarks: string | null;
		isDisplayed: boolean;
	}[],
	transaction?: Transaction,
) => {
	const confirmedOccurrences: {
		maxAttendee: number;
		categoryId: number | null;
		occasionId: number | null;
		startAt: string | Date;
		endAt: string;
		startDate?: string | Date;
		remarks: string | null;
		isDisplayed: boolean;
		deletedAt: null;
	}[] = [];
	const occurrences = await db.occurrences.findAll({
		attributes: ['occurrenceId', 'startAt', 'endAt', 'deletedAt'],
		where: {
			categoryId: categoryId,
			occasionId: occasionId,
			startAt: {
				[Op.in]: occurrenceData.map((o) => o.startAt),
			},
		},
		paranoid: false,
		transaction,
	});
	const result: { categoryId: number | null; occasionId: number | null; occurrenceIds: number[] } = {
		categoryId,
		occasionId,
		occurrenceIds: [],
	};
	occurrenceData.forEach((orb) => {
		const orbDate = new Date(orb.startAt).getMinutes();
		const startDate = moment(orb.startAt).format('YYYY-MM-DD');
		const odb = occurrences.find((o) => {
			return 0 == new Date(o.startAt).getMinutes() - orbDate;
		});
		if (odb == null || odb.deletedAt != null) {
			confirmedOccurrences.push({
				maxAttendee: orb.maxAttendee,
				categoryId,
				occasionId,
				startAt: orb.startAt,
				endAt: orb.endAt,
				startDate: startDate,
				isDisplayed: orb.isDisplayed,
				remarks: orb.remarks,
				deletedAt: null,
			});
		}
	});
	if (confirmedOccurrences.length > 0) {
		const createdOccurrences = await db.occurrences.bulkCreate(confirmedOccurrences as any, {
			fields: ['maxAttendee', 'categoryId', 'occasionId', 'startDate', 'startAt', 'endAt', 'remarks', 'isDisplayed'],
			updateOnDuplicate: ['maxAttendee', 'deletedAt', 'isDisplayed'],
			transaction,
		});
		result.occurrenceIds.push(...createdOccurrences.map((o) => o.occurrenceId));
		return result;
	} else {
		return result;
	}
};

export const updateOccurrence = async (
	{ occurrenceId, params }: { occurrenceId: number; params: WhereAttributeHash },
	transaction?: Transaction,
) =>
	db.occurrences
		.findByPk(occurrenceId, {
			attributes: {
				include: [[cast(fn('IFNULL', fn('SUM', col('registrations.expected')), 0), 'signed'), 'sumExpected']],
			},
			include: {
				association: db.occurrences.associations.registrations,
				attributes: [],
			},
			transaction,
		})
		.then((occurrence) => {
			if (occurrence == null) {
				throw new AppError(SYSTEM_ERROR, `occurrence ${occurrenceId} does not exist`, false);
			} else if (params.maxAttendee != null && (occurrence.sumExpected as number) > params.maxAttendee) {
				throw new AppError(
					SYSTEM_ERROR,
					`occurrence.sumExpected ${occurrence.sumExpected} > maxAttendee ${params.maxAttendee}`,
					false,
				);
			} else if (params.maxAttendee != null) {
				occurrence.set({ maxAttendee: params.maxAttendee });
			}
			if (params.isDisplayed != null) {
				occurrence.set({ isDisplayed: params.isDisplayed });
			}
			if (params.remarks != undefined) {
				occurrence.set({ remarks: params.remarks });
			}
			return occurrence.save({ transaction });
		});

export const deleteOccurrence = async (occurrenceId: number, transaction?: Transaction) =>
	db.occurrences.findByPk(occurrenceId, { transaction }).then(async (occurrence) => {
		if (occurrence == null) {
			throw new AppError(SYSTEM_ERROR, `occurrence ${occurrenceId} does not exist`, false);
		} else {
			const { categoryId, occasionId, occurrenceId } = occurrence;
			await occurrence.destroy({ transaction });
			return { categoryId, occasionId, occurrenceId };
		}
	});

export const bulkDeleteOccurrences = async (occurrenceWhere: WhereAttributeHash, transaction?: Transaction) => {
	const registrations = await db.registrations.findAll({
		attributes: ['registrationId'],
		include: {
			association: db.registrations.associations.Occurrence,
			where: occurrenceWhere,
		},
		transaction,
	});
	await Promise.all([
		db.occurrences.destroy({ where: occurrenceWhere, transaction }),
		db.registrations.destroy({
			where: { registrationId: { [Op.in]: registrations.map((r) => r.registrationId as number) } },
			transaction,
		}),
	]);
	return;
};

export const countOccurrencesToBeDeleted = async (occurrenceWhere: WhereAttributeHash, transaction?: Transaction) =>
	db.occurrences.count({ where: occurrenceWhere, transaction });

export const pushEventAndCountClientRegistrationToRedis = async () => {
	const allOccurrence = await db.occurrences.findAll({
		include: [
			{
				association: db.occurrences.associations.registrations,
				attributes: ['expected'],
			},
		],
	});
	if (!isEmpty(allOccurrence)) {
		for (const occurrence of allOccurrence) {
			const sum = occurrence.registrations!.reduce((p, c) => p + c.expected, 0);

			if (moment().isBefore(occurrence.endAt) && sum < occurrence.maxAttendee) {
				if (occurrence?.registrations) {
					await redisCacheService.setOccurrenceRegisterCount(occurrence.occurrenceId, sum);
				}
			}
		}
	}
	return true;
};
