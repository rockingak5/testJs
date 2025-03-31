import _, { get } from 'lodash';
import moment from 'moment';
import { col, CreationAttributes, IncludeOptions, Op, Sequelize, Transaction, WhereAttributeHash } from 'sequelize';

import {
	BAD_REQUEST,
	CONFLICT_ERROR,
	EVENT_REGISTRATIONS_REPLACER_MESSAGE,
	NOT_ACCEPTABLE,
	PAYMENT_STATUS,
	PAYMENT_TYPE,
	REMINDER_NOTIFY_TYPES,
	SYSTEM_ERROR,
	systemConfig,
} from '../config';
import { db } from '../models';
import { Member } from '../models/memberModel';
import { Registration } from '../models/registrationModel';
import veritransService from '../services/veritrans/veritrans.class';
import { AppError } from '../utilities';
import { getBookingDeadline } from './settingService';
import { LineService, ReminderService, SettingService, SocketServerService, SpectatorService } from '.';
import { CustomerRegistration } from '~models/customerRegistrationModel';
import { ProjectionAlias } from 'sequelize/types/model';
import { redisCacheService } from '~services/redisCacheService';
import { sendLineToAdminAfterRegistrationEvent } from '~services/lineService';

const {
	replacerName,
	replacerDateTime,
	replacerTelephoneCompany,
	replacerConfirmationUrl,
	replacerBuilding,
} = EVENT_REGISTRATIONS_REPLACER_MESSAGE;

export const getRegistrationForCSV = async (include: IncludeOptions | IncludeOptions[], where: WhereAttributeHash) =>
	db.registrations.findAll({ where: where, include: include });

export const getRegistration = async (registrationId: number, memberId?: number, transaction?: Transaction) =>
	db.registrations.findOne({
		where: {
			registrationId: registrationId,
			memberId: memberId,
		},
		include: [
			{
				association: db.registrations.associations.Member,
				attributes: { exclude: ['lineId', 'curRM'] },
			},
			{
				association: db.registrations.associations.Occurrence,
			},
			{
				association: db.registrations.associations.Occasion,
			},
			{
				association: db.registrations.associations.Category,
			},
		],
		transaction,
	});
export const getCampaignRegistrations = async (campaignId: number, transaction?: Transaction) =>
	db.registrations.findAll({
		where: {
			campaignId: campaignId,
		},
		include: [
			{
				association: db.registrations.associations.Member,
				attributes: [
					'memberId',
					'memberCode',
					'lineId',
					'displayName',
					'picUrl',
					'firstName',
					'lastName',
					'firstNameKana',
					'lastNameKana',
					'email',
					'telephone',
					'postalCode',
					'building',
					'address',
					'memberSince',
					'curRM',
					'isCampaign',
					'candidateAt',
					'isRegistered',
					'isFriends',
					'unreadCount',
					'createdAt',
					'updatedAt',
					'customerRegistrationId1',
					'customerRegistrationId2',
				],
			},
			{
				association: db.registrations.associations.memberGifts,
				include: [
					{
						association: db.memberGifts.associations.Gift,
					},
				],
			},
		],
		transaction,
	});

export const getAttended = async (memberId?: number) => {
	const dataRegistrations = await db.registrations.findAll({
		where: {
			memberId,
			campaignId: null,
		},
		include: [
			{
				association: db.registrations.associations.Category,
				paranoid: false,
				attributes: ['isSettingTime', 'startDate', 'endDate', 'categoryId', 'title'],
			},
			{
				association: db.registrations.associations.Occasion,
				paranoid: false,
				attributes: [],
			},
			{
				association: db.registrations.associations.Occurrence,
				paranoid: false,
				attributes: ['startAt', 'endAt', 'startDate'],
			},
			{
				association: db.registrations.associations.Member,
				attributes: [],
			},
		],
		paranoid: false,
		order: [['createdAt', 'DESC']],
		attributes: ['cancelledAt', 'attended', [Sequelize.literal('`Occasion`.`title`'), 'nameProgram']],
	});

	if (dataRegistrations == null) {
		throw new AppError(SYSTEM_ERROR, `registration ${memberId} does not exist`, false);
	}

	const data = dataRegistrations?.map((item) => {
		let action = '';
		let startAt = null;
		let endAt = null;

		if (item?.cancelledAt) {
			action = '当日キャンセル';
		} else if (item?.attended) {
			action = 'イベント参加';
		} else if (
			moment().isSameOrAfter(
				moment(
					`${moment(item?.Occurrence?.startDate).format('YYYY-MM-DD')} ${moment(item?.Occurrence?.startAt).format(
						'HH:mm',
					)}`,
				),
			)
		) {
			action = '不参加';
		} else {
			action = '予約';
		}

		if (item?.Category?.isSettingTime) {
			startAt = item?.Category?.startDate;
			endAt = item?.Category?.endDate;
		} else {
			startAt = item?.Occurrence?.startAt;
			endAt = item?.Occurrence?.endAt;
		}

		return {
			id: item?.Category?.categoryId,
			date: item?.Occurrence?.startDate,
			startAt,
			endAt,
			nameEvent: item?.Category?.title,
			action,
			nameProgram: _.get(item.toJSON(), 'nameProgram'),
		};
	});

	return data;
};

export const getCampaignsAttended = async (memberId: number) => {
	return db.registrations.findAll({
		where: { categoryId: null, memberId },
		include: [
			{
				model: db.campaigns,
				attributes: [],
				// include: [
				// 	{
				// 		model: db.campaignQuestions
				// 		// attributes: []
				// 	}
				// ]
			},
			{
				model: db.memberGifts,
				attributes: [
					//
					[Sequelize.literal('`memberGifts->Gift`.`title`'), 'name'],
					[Sequelize.literal('`memberGifts->Gift`.`giftId`'), 'id'],
				],
				include: [
					{
						model: db.gifts,
						attributes: [],
					},
				],
			},
		],
		order: [['createdAt', 'DESC']],
		attributes: [
			//
			'note',
			'campaignId',
			'createdAt',
			[Sequelize.literal('`Campaign`.`title`'), 'title'],
		],
	});
};

export const editRegistration = async (
	editParams: CreationAttributes<Registration> & CreationAttributes<Member>,
	transaction?: Transaction,
) => {
	const registration = await db.registrations.findOne({
		where: { registrationId: editParams.registrationId },
		include: [
			{
				association: db.registrations.associations.Member,
				required: false,
			},
			{
				association: db.registrations.associations.Occasion,
				attributes: ['occasionId'],
			},
		],
		transaction,
	});
	if (registration == null) {
		throw new AppError(SYSTEM_ERROR, `registration ${editParams.registrationId} not found`, false);
	}
	const member = registration.Member;
	if (member && member.memberCode == null) {
		// let manualMemberUpdateParams=
		member.set({
			address: editParams.address,
			building: editParams.building,
			firstName: editParams.firstName,
			firstNameKana: editParams.firstNameKana,
			lastName: editParams.lastName,
			lastNameKana: editParams.lastNameKana,
			postalCode: editParams.postalCode,
			email: editParams.email,
			telephone: editParams.telephone,
		});
		if (member.changed()) {
			await member.save({ transaction });
		}
	}
	const registrationUpdateParams = {
		remarks: editParams.remarks,
		message: editParams.message,
	};
	await registration.update(registrationUpdateParams, { transaction });
	const { memberId, occurrenceId, occasionId, categoryId } = registration;
	return { memberId, occurrenceId, occasionId, categoryId } as registrationEmitType;
};
export const updateMemberRegistrations = async (
	{
		updateParams,
		registrationIds,
	}: { updateParams: { remarks: string | null; message: string | null }; registrationIds: number[] },
	transaction?: Transaction,
) =>
	db.registrations.update(
		{ message: updateParams.message, remarks: updateParams.remarks },
		{ where: { registrationId: { [Op.in]: registrationIds } }, transaction },
	);

export const cancelRegistration = async (
	registrationId: number,
	memberId?: number,
	isOverride = false,
	transaction?: Transaction,
) => {
	const systemSettings = (await db.systemSettings
		.findAll({
			raw: true,
			where: {
				name: {
					[Op.in]: [
						//
						'bookCancelAllowed',
						'bookCancelLimitDay',
						'bookCancelLimitHour',
						'bookCancelLimitMinute',
					],
				},
			},
			attributes: ['name', 'valueNumber', 'valueFlag'],
		})
		.then((settings) =>
			settings.reduce(
				(prev, { name, valueNumber, valueFlag }) => ({
					...prev,
					[name]: valueFlag || valueNumber,
				}),
				{},
			),
		)) as Record<'bookCancelAllowed' | 'bookCancelLimitDay' | 'bookCancelLimitHour' | 'bookCancelLimitMinute', number>;

	const registration = await db.registrations.findByPk(registrationId, {
		include: [
			{
				association: db.registrations.associations.Occurrence,
				attributes: ['occurrenceId', 'occasionId', 'startAt'],
			},
			{
				association: db.registrations.associations.Occasion,
				attributes: ['occasionId', 'categoryId', 'cancelable', 'fee'],
				include: [
					{
						association: db.occasions.associations.cancelConditions,
						attributes: ['day', 'hour', 'minute', 'refundPercentage'],
						separate: true,
					},
				],
			},
			{
				association: db.registrations.associations.Category,
				attributes: ['categoryId', 'title', 'fee', 'cancelable'],
				include: [
					{
						association: db.categories.associations.cancelConditions,
						attributes: ['day', 'hour', 'minute', 'refundPercentage'],
					},
				],
			},
		],
		attributes: [
			'registrationId',
			'attended',
			'updatedAt',
			'memberId',
			'occurrenceId',
			'occasionId',
			'categoryId',
			'expected',
		],
		transaction,
	});

	if (
		registration?.attended === 1 ||
		(memberId &&
			(!registration?.Category?.cancelable || !registration?.Category?.cancelConditions?.length) &&
			(!registration?.Occasion?.cancelable || !registration?.Occasion?.cancelConditions?.length) &&
			!systemSettings.bookCancelAllowed)
	) {
		throw new AppError(BAD_REQUEST, 'キャンセル不可');
	}

	if (!registration || registration.Occurrence == undefined || registration.Category == undefined) {
		throw new AppError(SYSTEM_ERROR, `registration ${registrationId} does not exist`, false);
	} /* else if ((memberId && registration.memberId != memberId) || registration.attended > 0) {
		throw new AppError(
			SYSTEM_ERROR,
			`registration ${registrationId} does not belong to member ${memberId} or attended > 0 ${registration.attended}`,
			false
		)
	} */
	const startAt = registration.Occurrence.startAt;
	const categoryTitle = registration.Category.title;

	const OccurrenceTransaction = await db.transaction.findOne({
		where: {
			memberId: registration.memberId!,
			occurrenceId: registration.occurrenceId,
		},
		order: [['createdAt', 'DESC']],
		raw: true,
	});

	const now = moment();
	const bestMatchCancelCondition = (
		registration?.Occasion?.cancelable || registration?.Category?.cancelable
			? registration?.Occasion?.cancelConditions || registration?.Category?.cancelConditions || []
			: [
					{
						toJSON: () => ({
							day: systemSettings.bookCancelLimitDay,
							hour: systemSettings.bookCancelLimitHour,
							minute: systemSettings.bookCancelLimitMinute,
							refundPercentage: 100,
						}),
					},
			  ]
	)
		.map((cancelCondition) => {
			const { day, hour, minute, ...etc } = cancelCondition.toJSON() as any;
			return {
				...etc,
				dueDate: moment(registration?.Occurrence?.startAt)
					.subtract(day, 'day')
					.hour(hour)
					.minute(minute)
					.format('YYYY-MM-DD HH:mm:ss'),
			};
		})
		.sort((a, b) => moment(a.dueDate).diff(moment(b.dueDate)))
		.find(({ dueDate }) => {
			return now.isBefore(dueDate);
		});

	if (memberId && !bestMatchCancelCondition) {
		throw new AppError(BAD_REQUEST, 'キャンセル不可');
	}

	if (
		OccurrenceTransaction &&
		OccurrenceTransaction.type === PAYMENT_TYPE.PURCHASE &&
		OccurrenceTransaction.status === PAYMENT_STATUS.FULFILLED
	) {
		const amount = parseFloat(`${OccurrenceTransaction.amount}`) * (bestMatchCancelCondition.refundPercentage / 100);

		await db.transaction.create(
			{
				memberId: OccurrenceTransaction.memberId,
				occurrenceId: OccurrenceTransaction.occurrenceId,
				type: PAYMENT_TYPE.REFUND,
				amount,
				orderId: OccurrenceTransaction.orderId,
				status: PAYMENT_STATUS.FULFILLED,
			},
			{ transaction },
		);
		await veritransService.cancelTransaction({
			order_id: OccurrenceTransaction.orderId,
			amount,
		});
	}

	await registration.update({ cancelledAt: new Date() }, { transaction });

	await registration.destroy({ transaction });

	return {
		memberId: registration.memberId as number,
		categoryId: registration.categoryId as number,
		occasionId: registration.occasionId,
		occurrenceId: registration.occurrenceId,
		startAt: startAt,
		registrationId: registration.registrationId,
		categoryTitle: categoryTitle,
		expected: registration.expected,
	} as registrationEmitType & { startAt: Date; registrationId: number; categoryTitle: string; expected: number };
};

export const deleteRegistration = async (registrationId: number, transaction?: Transaction) => {
	let socketData: registrationEmitType;
	return db.registrations
		.findByPk(registrationId, {
			paranoid: false,
			transaction,
		})
		.then((registration) => {
			if (registration == null) {
				throw new AppError(SYSTEM_ERROR, `registration ${registrationId} does not exist`);
			} else {
				socketData = {
					memberId: registration.memberId as number,
					categoryId: registration.categoryId,
					occasionId: registration.occasionId,
					occurrenceId: registration.occurrenceId,
				};
				return registration.destroy({ transaction });
			}
		})
		.then(() => socketData);
};
export const listMemberRegistrations = async (
	registrationWhere: { memberId?: number; registrationId?: string },
	occurrenceWhere: WhereAttributeHash,
	transaction?: Transaction,
) =>
	db.registrations.findAll({
		where: { ...registrationWhere, campaignId: null },
		include: [
			{
				association: db.registrations.associations.Occurrence,
				attributes: ['occurrenceId', 'startAt', 'startDate', 'endAt', 'occasionId', 'isSettingTime'],
				where: {
					[Op.or]: [
						{
							isSettingTime: true,
							startDate: { [Op.gte]: moment().startOf('days').toDate() },
						},
						{
							isSettingTime: false,
							...occurrenceWhere,
						},
					],
				},
				order: [[db.occurrences, col('startAt'), 'asc']],
			},
			{
				association: db.occurrences.associations.Occasion,
				attributes: [
					//
					'title',
					'occasionId',
					'isMultiEvent',
					'startDate',
					'endDate',
					'isSettingTime',
					'fee',
					'cancelDescription',
					'cancelable',
				],
				include: [
					{
						model: db.occasionCancelConditions,
						attributes: ['day', 'hour', 'minute', 'refundPercentage'],
						separate: true,
					},
				],
			},
			{
				association: db.occasions.associations.Category,
				attributes: [
					'title',
					'categoryId',
					'isMultiEvent',
					'startDate',
					'endDate',
					'isSettingTime',
					'type',
					'cancelDescription',
					'cancelable',
				],
				include: [
					{
						model: db.categoryCancelConditions,
						attributes: ['day', 'hour', 'minute', 'refundPercentage'],
						separate: true,
					},
				],
			},
		],
		transaction,
	});
export const listMemberCampaignRegistrations = async (
	registrationWhere: { memberId?: number; registrationId?: string },
	occurrenceWhere: WhereAttributeHash,
	transaction?: Transaction,
) =>
	db.registrations.findAll({
		where: { ...registrationWhere, categoryId: null },
		include: [
			{
				association: db.registrations.associations.Occurrence,
				attributes: ['occurrenceId', 'startAt', 'startDate', 'endAt', 'occasionId', 'isSettingTime'],
				where: {
					...occurrenceWhere,
				},
				order: [[db.occurrences, col('startAt'), 'asc']],
			},
			{
				association: db.gifts.associations.Campaign,
				attributes: ['title', 'campaignId', 'isMultiEvent'],
			},
		],
		transaction,
	});

export const getRegistration_Member = async (registrationId: number, memberId: number, transaction?: Transaction) =>
	db.registrations.findOne({
		where: { registrationId: registrationId, memberId: memberId },
		include: [
			{
				association: db.registrations.associations.Occurrence,
				order: [[db.occurrences, col('startAt'), 'asc']],
			},
			{
				association: db.occurrences.associations.Occasion,
				include: [
					{
						separate: true,
						association: db.occasions.associations.occasionDetails,
						attributes: { exclude: ['occasionDetailId', 'occasionId'] },
					},
					{
						separate: true,
						association: db.occasions.associations.occasionImages,
						attributes: { exclude: ['occasionImageId', 'occasionId'] },
					},
				],
				order: [[db.occasionDetails, col('showOrder'), 'asc']],
			},
			{
				association: db.occasions.associations.Category,
				include: [
					{
						separate: true,
						association: db.categories.associations.cancelConditions,
						attributes: ['day', 'hour', 'minute', 'refundPercentage'],
					},
					{
						separate: true,
						association: db.categories.associations.categoryAreas,
						attributes: { exclude: ['categoryAreaId', 'categoryId'] },
					},
					{
						separate: true,
						association: db.categories.associations.categoryDetails,
						attributes: { exclude: ['categoryDetailId', 'categoryId'] },
					},
					{
						separate: true,
						association: db.categories.associations.categoryImages,
						attributes: { exclude: ['categoryImageId', 'categoryId'] },
					},
					{
						separate: true,
						association: db.categories.associations.categoryTags,
						attributes: { exclude: ['categoryTagId', 'categoryId'] },
					},
				],
				order: [
					[db.occasionImages, col('showOrder'), 'asc'],
					[db.categoryAreas, col('showOrder'), 'asc'],
					[db.categoryDetails, col('showOrder'), 'asc'],
					[db.categoryImages, col('showOrder'), 'asc'],
					[db.categoryTags, col('showOrder'), 'asc'],
				],
			},
		],
		transaction,
	});
export const getRegistrationMember = async (registrationId: number, memberId: number, transaction?: Transaction) =>
	db.registrations.findOne({
		where: { registrationId: registrationId, memberId: memberId },
		include: [
			{
				association: db.registrations.associations.Occurrence,
				order: [[db.occurrences, col('startAt'), 'asc']],
			},
			{
				association: db.registrations.associations.memberGifts,
				attributes: ['giftId'],
				include: [
					{
						association: db.memberGifts.associations.Gift,
						attributes: ['type', 'title'],
					},
				],
			},
			{
				association: db.gifts.associations.Campaign,
				include: [
					{
						separate: true,
						association: db.campaigns.associations.categoryAreas,
						attributes: { exclude: ['categoryAreaId', 'categoryId', 'campaignId'] },
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryDetails,
						attributes: { exclude: ['categoryDetailId', 'categoryId', 'campaignId'] },
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryImages,
						attributes: { exclude: ['categoryImageId', 'categoryId', 'campaignId'] },
					},
					{
						separate: true,
						association: db.campaigns.associations.categoryTags,
						attributes: { exclude: ['categoryTagId', 'categoryId', 'campaignId'] },
					},
				],
				order: [
					[db.occasionImages, col('showOrder'), 'asc'],
					[db.categoryAreas, col('showOrder'), 'asc'],
					[db.categoryDetails, col('showOrder'), 'asc'],
					[db.categoryImages, col('showOrder'), 'asc'],
					[db.categoryTags, col('showOrder'), 'asc'],
				],
			},
		],
		transaction,
	});

export const generateRegistrationDataForCSV = async ({
	registrationWhere,
	occasionWhere,
	categoryWhere,
	customerRegistrations,
	occurrenceWhere,
}: {
	registrationWhere: WhereAttributeHash;
	occasionWhere: WhereAttributeHash;
	categoryWhere: WhereAttributeHash;
	occurrenceWhere: WhereAttributeHash;
	customerRegistrations: CustomerRegistration[];
}) => {
	return db.registrations.findAll({
		where: registrationWhere,
		attributes: [
			[col('Registration.memberId'), 'memberId'],
			[col('Registration.message'), 'message'],
			[col('Member.memberCode'), 'memberCode'],
			[col('Member.displayName'), 'displayName'],
			[col('Member.firstName'), 'firstName'],
			[col('Member.lastName'), 'lastName'],
			[col('Member.firstNameKana'), 'firstNameKana'],
			[col('Member.lastNameKana'), 'lastNameKana'],
			[col('Member.email'), 'email'],
			[col('Member.telephone'), 'telephone'],
			[col('Member.postalCode'), 'postalCode'],
			[col('Member.building'), 'building'],
			[col('Member.address'), 'address'],
			[col('Member.memberSince'), 'memberSince'],
			[col('Member.isCampaign'), 'isCampaign'],
			[col('Member.candidateAt'), 'candidateAt'],
			[col('Member.isFriends'), 'isFriends'],
			[col('Category.title'), 'categoryTitle'],
			[col('Occasion.title'), 'occasionTitle'],
			[col('Occurrence.startAt'), 'startAt'],
			[col('Member.notes'), 'notes'],
			[col('Member.countVisit'), 'countVisit'],
			[col('Member.lastVisit'), 'lastVisit'],
			[col('Member.currentPoints'), 'currentPoints'],
			[col('Member.createdAt'), 'createdAt'],
			[col('Member.activeUntil'), 'activeUntil'],
			[col('Member.lineId'), 'lineId'],
			...customerRegistrations.map(
				({ customerRegistrationId }) =>
					[
						col(`Member.customerRegistrationId${customerRegistrationId}`),
						`customerRegistrationId${customerRegistrationId}`,
					] as ProjectionAlias,
			),
		],
		include: [
			{
				association: db.registrations.associations.Member,
				required: true,
				attributes: [],
			},
			{
				association: db.registrations.associations.Occurrence,
				required: true,
				attributes: [],
				where: occurrenceWhere,
			},
			{
				association: db.registrations.associations.Occasion,
				required: occasionWhere && Object.keys(occasionWhere).length > 0 ? true : false,
				where: occasionWhere,
				attributes: [],
			},
			{
				association: db.registrations.associations.Category,
				required: true,
				attributes: [],
				where: categoryWhere,
			},
		],
		raw: true,
		nest: true,
	});
};

export const memberRegisterForEvent = async (
	{
		occurrenceId,
		member,
		message = '',
		dataNote = null,
		isManual = false,
		participantName,
		participantCount = 0,
		companionCount = 0,
		timeZone,
	}: {
		occurrenceId: number;
		member: Member;
		message?: string;
		dataNote?: any;
		isManual?: boolean;
		participantName?: string;
		participantCount?: number;
		companionCount?: number;
		timeZone?: string;
	},
	transaction?: Transaction,
) => {
	const memberInfo = member.memberId ? member.toJSON() : (member as registrationMemberInfoType);
	const occurrence = await db.occurrences.findByPk(occurrenceId, {
		include: [
			{
				association: db.occurrences.associations.registrations,
				attributes: ['expected'],
			},
			{
				association: db.occurrences.associations.Occasion,
				attributes: [
					'occasionId',
					'categoryId',
					'title',
					'isMultiEvent',
					'startDate',
					'endDate',
					'isSettingTime',
					'notRegisterEventSameTime',
					'startRegistration',
					'endRegistration',
					'message',
					'fee',
					'groupBooking',
					'isMessage',
				],
				include: [
					{
						model: db.categoryMessageDetails,
					},
				],
			},
			{
				association: db.occurrences.associations.Category,
				attributes: [
					'title',
					'isMultiEvent',
					'startDate',
					'endDate',
					'isSendImage',
					'isSettingTime',
					'notRegisterEventSameTime',
					'startRegistration',
					'endRegistration',
					'isProgram',
					'fee',
					'groupBooking',
					'isMessage',
				],
				include: [
					{
						association: db.categories.associations.categoryImages,
					},
					{
						association: db.categories.associations.categoryDetails,
					},
					{
						association: db.categories.associations.categoryMessages,
					},
					{
						model: db.categoryMessageDetails,
					},
				],
			},
		],
	});

	if (occurrence == null) {
		throw new AppError(SYSTEM_ERROR, `occurrence ${occurrenceId} does not exist`);
	}

	const totalClientAttendee = occurrence.Category?.groupBooking ? participantCount + companionCount : 1;

	const sum = await redisCacheService.increaseOccurrenceRegisterCount(occurrenceId, totalClientAttendee);

	const fee = parseFloat(`${occurrence?.Occasion?.fee || occurrence?.Category?.fee}`);

	let OccurrenceTransaction;

	if (fee > 0) {
		OccurrenceTransaction = await db.transaction.findOne({
			where: {
				memberId: member.memberId!,
				occurrenceId,
				amount: fee,
			},
			raw: true,
			order: [['createdAt', 'DESC']],
		});

		if (
			!OccurrenceTransaction ||
			OccurrenceTransaction.type !== PAYMENT_TYPE.PURCHASE ||
			OccurrenceTransaction.status !== PAYMENT_STATUS.FULFILLED
		) {
			throw new AppError(BAD_REQUEST, 'ご入金後にご登録ください。', true);
		}
	}

	if (
		!isManual &&
		// occurrence.maxAttendee < sum + (occurrence.Category?.groupBooking ? participantCount + companionCount : 1)
		occurrence.maxAttendee < sum
	) {
		throw new AppError(CONFLICT_ERROR, `occurrence ${occurrenceId} is full: ${totalClientAttendee}`);
	}

	const registrations: any = await db.registrations.findAll({
		where: {
			memberId: member.memberId,
			categoryId: {
				[Op.not]: null,
			},
		},
		include: [
			{
				association: db.registrations.associations.Category,
			},
			{
				association: db.registrations.associations.Occasion,
			},
			{
				association: db.registrations.associations.Occurrence,
			},
		],
	});

	if (occurrence?.Category?.isProgram) {
		if (occurrence?.Occasion?.isSettingTime && moment(occurrence?.startDate).isBefore(moment())) {
			throw new AppError(SYSTEM_ERROR, 'startDate isBefore date now');
		}

		const occurrenceStartDate = moment(occurrence?.Occasion?.startDate);
		const occurrenceEndDate = moment(occurrence?.Occasion?.endDate);

		const occurrenceStartRegistration = moment(occurrence?.Occasion?.startRegistration);
		const occurrenceEndRegistration = moment(occurrence?.Occasion?.endRegistration);

		const occurrenceStartAt = moment(occurrence?.startAt);
		const occurrenceEndAt = moment(occurrence?.endAt);

		if (moment().isBefore(occurrenceStartRegistration) || moment().isAfter(occurrenceEndRegistration)) {
			throw new AppError(SYSTEM_ERROR, 'Invalid registration time');
		}

		registrations.forEach((item: any) => {
			if (item.Category?.isProgram) {
				const startDate = moment(item?.Occasion?.startDate);
				const endDate = moment(item?.Occasion?.endDate);

				const startAt = moment(item?.Occurrence?.startAt);
				const endAt = moment(item?.Occurrence?.endAt);

				// if (item?.Occurrence?.occurrenceId === occurrenceId) {
				// 	throw new AppError(BAD_REQUEST, 'Duplicate event registrations are not allowed')
				// }

				if (occurrence?.Occasion?.isSettingTime) {
					if (item?.Occasion?.isSettingTime) {
						if (!(item?.Occasion?.isMultiEvent && occurrence?.Occasion?.isMultiEvent)) {
							if (
								occurrenceStartDate.isBetween(startDate, endDate) ||
								occurrenceEndDate.isBetween(startDate, endDate) ||
								(occurrenceStartDate.isSameOrBefore(startDate) && occurrenceStartDate.isSameOrAfter(endDate)) ||
								(occurrenceStartDate.isSame(startDate) && occurrenceStartDate.isSame(endDate))
							) {
								throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
							}
						}
					} else {
						if (!item?.Occasion?.isMultiEvent) {
							throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
						} else {
							if (item?.Occasion?.notRegisterEventSameTime) {
								if (
									occurrenceStartAt.isBetween(startAt, endAt) ||
									occurrenceEndAt.isBetween(startAt, endAt) ||
									(occurrenceStartAt.isSameOrBefore(startAt) && occurrenceEndAt.isSameOrAfter(endAt)) ||
									(occurrenceStartAt.isSame(startAt) && occurrenceEndAt.isSame(endAt))
								) {
									throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
								}
							}
						}
					}
				} else {
					if (!occurrence?.Occasion?.isMultiEvent) {
						throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません。');
					} else {
						if (occurrence?.Occasion?.notRegisterEventSameTime || item?.Occasion?.notRegisterEventSameTime) {
							if (
								occurrenceStartAt.isBetween(startAt, endAt) ||
								occurrenceEndAt.isBetween(startAt, endAt) ||
								(occurrenceStartAt.isSameOrBefore(startAt) && occurrenceEndAt.isSameOrAfter(endAt)) ||
								(occurrenceStartAt.isSame(startAt) && occurrenceEndAt.isSame(endAt))
							) {
								throw new AppError(BAD_REQUEST, '同時に複数のイベント予約はできません');
							}
						}
					}
				}
			} else {
				const startDate = moment(item?.Category?.startDate);
				const endDate = moment(item?.Category?.endDate);

				const startAt = moment(item?.Occurrence?.startAt);
				const endAt = moment(item?.Occurrence?.endAt);

				// if (item?.Occurrence?.occurrenceId === occurrenceId) {
				// 	throw new AppError(BAD_REQUEST, 'Duplicate event registrations are not allowed')
				// }

				if (occurrence?.Occasion?.isSettingTime) {
					if (item?.Category?.isSettingTime) {
						if (!(item?.Category?.isMultiEvent && occurrence?.Occasion?.isMultiEvent)) {
							if (
								occurrenceStartDate.isBetween(startDate, endDate) ||
								occurrenceEndDate.isBetween(startDate, endDate) ||
								(occurrenceStartDate.isSameOrBefore(startDate) && occurrenceStartDate.isSameOrAfter(endDate)) ||
								(occurrenceStartDate.isSame(startDate) && occurrenceStartDate.isSame(endDate))
							) {
								throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
							}
						}
					} else {
						if (!item?.Category?.isMultiEvent) {
							throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
						} else {
							if (item?.Category?.notRegisterEventSameTime) {
								if (
									occurrenceStartAt.isBetween(startAt, endAt) ||
									occurrenceEndAt.isBetween(startAt, endAt) ||
									(occurrenceStartAt.isSameOrBefore(startAt) && occurrenceEndAt.isSameOrAfter(endAt)) ||
									(occurrenceStartAt.isSame(startAt) && occurrenceEndAt.isSame(endAt))
								) {
									throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
								}
							}
						}
					}
				} else {
					if (!occurrence?.Occasion?.isMultiEvent) {
						throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません。');
					} else {
						if (occurrence?.Occasion?.notRegisterEventSameTime || item?.Category?.notRegisterEventSameTime) {
							if (
								occurrenceStartAt.isBetween(startAt, endAt) ||
								occurrenceEndAt.isBetween(startAt, endAt) ||
								(occurrenceStartAt.isSameOrBefore(startAt) && occurrenceEndAt.isSameOrAfter(endAt)) ||
								(occurrenceStartAt.isSame(startAt) && occurrenceEndAt.isSame(endAt))
							) {
								throw new AppError(BAD_REQUEST, '同時に複数のイベント予約はできません');
							}
						}
					}
				}
			}
		});
	} else {
		if (occurrence?.Category?.isSettingTime && moment(occurrence?.startDate).isBefore(moment())) {
			throw new AppError(SYSTEM_ERROR, 'startDate isBefore date now');
		}

		const occurrenceStartDate = moment(occurrence?.Category?.startDate);
		const occurrenceEndDate = moment(occurrence?.Category?.endDate);

		const occurrenceStartRegistration = moment(occurrence?.Category?.startRegistration);
		const occurrenceEndRegistration = moment(occurrence?.Category?.endRegistration);

		const occurrenceStartAt = moment(occurrence?.startAt);
		const occurrenceEndAt = moment(occurrence?.endAt);

		if (moment().isBefore(occurrenceStartRegistration) || moment().isAfter(occurrenceEndRegistration)) {
			throw new AppError(SYSTEM_ERROR, 'Invalid registration time');
		}

		registrations.forEach((item: any) => {
			if (item.Category?.isProgram) {
				const startDate = moment(item?.Occasion?.startDate);
				const endDate = moment(item?.Occasion?.endDate);

				const startAt = moment(item?.Occurrence?.startAt);
				const endAt = moment(item?.Occurrence?.endAt);

				// if (item?.Occurrence?.occurrenceId === occurrenceId) {
				// 	throw new AppError(BAD_REQUEST, 'Duplicate event registrations are not allowed')
				// }

				if (occurrence?.Category?.isSettingTime) {
					if (item?.Occasion?.isSettingTime) {
						if (!(item?.Occasion?.isMultiEvent && occurrence?.Category?.isMultiEvent)) {
							if (
								occurrenceStartDate.isBetween(startDate, endDate) ||
								occurrenceEndDate.isBetween(startDate, endDate) ||
								(occurrenceStartDate.isSameOrBefore(startDate) && occurrenceStartDate.isSameOrAfter(endDate)) ||
								(occurrenceStartDate.isSame(startDate) && occurrenceStartDate.isSame(endDate))
							) {
								throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
							}
						}
					} else {
						if (!item?.Occasion?.isMultiEvent) {
							throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
						} else {
							if (item?.Occasion?.notRegisterEventSameTime) {
								if (
									occurrenceStartAt.isBetween(startAt, endAt) ||
									occurrenceEndAt.isBetween(startAt, endAt) ||
									(occurrenceStartAt.isSameOrBefore(startAt) && occurrenceEndAt.isSameOrAfter(endAt)) ||
									(occurrenceStartAt.isSame(startAt) && occurrenceEndAt.isSame(endAt))
								) {
									throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
								}
							}
						}
					}
				} else {
					if (!occurrence?.Category?.isMultiEvent) {
						throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません。');
					} else {
						if (occurrence?.Category?.notRegisterEventSameTime || item?.Occasion?.notRegisterEventSameTime) {
							if (
								occurrenceStartAt.isBetween(startAt, endAt) ||
								occurrenceEndAt.isBetween(startAt, endAt) ||
								(occurrenceStartAt.isSameOrBefore(startAt) && occurrenceEndAt.isSameOrAfter(endAt)) ||
								(occurrenceStartAt.isSame(startAt) && occurrenceEndAt.isSame(endAt))
							) {
								throw new AppError(BAD_REQUEST, '同時に複数のイベント予約はできません');
							}
						}
					}
				}
			} else {
				const startDate = moment(item?.Category?.startDate);
				const endDate = moment(item?.Category?.endDate);

				const startAt = moment(item?.Occurrence?.startAt);
				const endAt = moment(item?.Occurrence?.endAt);

				// if (item?.Occurrence?.occurrenceId === occurrenceId) {
				// 	throw new AppError(BAD_REQUEST, 'Duplicate event registrations are not allowed')
				// }

				if (occurrence?.Category?.isSettingTime) {
					if (item?.Category?.isSettingTime) {
						if (!(item?.Category?.isMultiEvent && occurrence?.Category?.isMultiEvent)) {
							if (
								occurrenceStartDate.isBetween(startDate, endDate) ||
								occurrenceEndDate.isBetween(startDate, endDate) ||
								(occurrenceStartDate.isSameOrBefore(startDate) && occurrenceStartDate.isSameOrAfter(endDate)) ||
								(occurrenceStartDate.isSame(startDate) && occurrenceStartDate.isSame(endDate))
							) {
								throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
							}
						}
					} else {
						if (!item?.Category?.isMultiEvent) {
							// bug
							throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
						} else {
							if (item?.Category?.notRegisterEventSameTime) {
								if (
									occurrenceStartAt.isBetween(startAt, endAt) ||
									occurrenceEndAt.isBetween(startAt, endAt) ||
									(occurrenceStartAt.isSameOrBefore(startAt) && occurrenceEndAt.isSameOrAfter(endAt)) ||
									(occurrenceStartAt.isSame(startAt) && occurrenceEndAt.isSame(endAt))
								) {
									throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
								}
							}
						}
					}
				} else {
					if (!occurrence?.Category?.isMultiEvent) {
						throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません。');
					} else {
						if (occurrence?.Category?.notRegisterEventSameTime || item?.Category?.notRegisterEventSameTime) {
							if (
								occurrenceStartAt.isBetween(startAt, endAt) ||
								occurrenceEndAt.isBetween(startAt, endAt) ||
								(occurrenceStartAt.isSameOrBefore(startAt) && occurrenceEndAt.isSameOrAfter(endAt)) ||
								(occurrenceStartAt.isSame(startAt) && occurrenceEndAt.isSame(endAt))
							) {
								throw new AppError(BAD_REQUEST, '同時に複数のイベント予約はできません');
							}
						}
					}
				}
			}
		});
	}

	const deadlineSettings = await getBookingDeadline();
	if (!occurrence?.Category?.isSettingTime && !occurrence?.Occasion?.isSettingTime) {
		if (moment(occurrence?.startAt).isBefore(moment())) {
			throw new AppError(SYSTEM_ERROR, 'startAt isBefore date now');
		}
		if (!isManual && !checkIfBookingBeforeDeadline(deadlineSettings, occurrence.startAt)) {
			throw new AppError(NOT_ACCEPTABLE, 'registration deadline has passed', false);
		}
	}

	let notes: any;
	if (occurrence?.Category?.isProgram && Array.isArray(occurrence?.Category?.categoryMessages) && dataNote) {
		const arrayMessage: string[] = occurrence?.Occasion?.message
			? JSON.parse(occurrence?.Occasion?.message as any)
			: [];
		const messageKeys = arrayMessage.reduce(
			(prev, curr) => ({
				...prev,
				[curr]: curr,
			}),
			{},
		);
		const categoryMessages = occurrence?.Category?.categoryMessages;

		notes = categoryMessages
			.filter((item) => item.label in messageKeys)
			.map((item) => ({
				label: item.label,
				value: dataNote[`label${item.categoryMessageId}`],
			}));
	} else {
		if (occurrence?.Category?.categoryMessages && occurrence?.Category?.categoryMessages.length > 0 && dataNote) {
			notes = occurrence?.Category?.categoryMessages?.map((item) => ({
				label: item.label,
				value: dataNote[`label${item?.categoryMessageId}`],
			}));
		}
	}

	transaction = await db.sequelize.transaction();

	const registration = await db.registrations.create(
		{
			memberId: memberInfo.memberId ?? null,
			expected:
				occurrence.Category?.groupBooking || occurrence.Occasion?.groupBooking ? participantCount + companionCount : 1,
			categoryId: occurrence.categoryId,
			occasionId: occurrence.occasionId,
			occurrenceId: occurrence.occurrenceId,
			message: message,
			note: occurrence?.Category?.categoryMessages ? notes : null,
			isRegistered: member.isRegistered,
			isFriends: member.isFriends,
			isManual: isManual,
			...(occurrence.Category?.groupBooking || occurrence.Occasion?.groupBooking
				? {
						participantName,
						participantCount,
						companionCount,
				  }
				: {}),
		},
		{ transaction },
	);

	if (OccurrenceTransaction) {
		await db.transaction.update(
			{
				registrationId: registration.registrationId,
			},
			{
				where: {
					id: OccurrenceTransaction.id,
				},
				transaction,
			},
		);
	}

	await transaction.commit();

	const registrationResult = {
		occasionId: occurrence.occasionId,
		categoryId: occurrence.categoryId,
		memberId: member.memberId,
		startAt: occurrence.startAt,
		isSettingTime: occurrence?.Category?.isSettingTime,
		registrationId: registration.registrationId,
		categoryTitle: occurrence?.Category?.title,
		categoryImages: occurrence?.Category?.categoryImages,
		isSendImage: occurrence?.Category?.isSendImage,
		isMessage: occurrence?.Category?.isProgram ? occurrence?.Occasion?.isMessage : occurrence?.Category?.isMessage,
		afterReservationMessage: occurrence?.Category?.isProgram
			? occurrence?.Occasion?.CategoryMessageDetail?.afterReservationMessage
			: occurrence?.Category?.CategoryMessageDetail?.afterReservationMessage,
		reminderMessageOneDay: occurrence?.Category?.isProgram
			? occurrence?.Occasion?.CategoryMessageDetail?.reminderMessageOneDay
			: occurrence?.Category?.CategoryMessageDetail?.reminderMessageOneDay,
		reminderMessageThreeDays: occurrence?.Category?.isProgram
			? occurrence?.Occasion?.CategoryMessageDetail?.reminderMessageThreeDays
			: occurrence?.Category?.CategoryMessageDetail?.reminderMessageThreeDays,
	} as ResMemberRegistrationEvent;

	if (!isManual && timeZone) {
		const messagesToClient = await SettingService.getRegistrationAndReminderMessages();

		const image: any = registrationResult?.categoryImages?.find((item: any) => item.showOrder === 0);

		if (member.lineId && registrationResult?.isSendImage && image?.picUrl) {
			const url = process.env.HOST
				? `${process.env.HOST}/uploads/categories/${image?.picUrl}`
				: `${systemConfig.PATH_FILE_UPLOAD_CATEGORY}/${image?.picUrl}`;

			await LineService.sendImageMessage(member.lineId, url);
		}

		const nameMember = get(memberInfo, 'customerRegistrationId1', '') as string;
		const phoneMember = get(memberInfo, 'customerRegistrationId2', '') as string;

		// cach 1
		if (member.lineId) {
			await LineService.sendLineAfterRegistrationEvent({
				registrationResult,
				messagesToClient,
				nameMember,
				memberLineId: member.lineId,
			});
		}

		await ReminderService.createMessageReminderEvent({
			messagesToClient,
			registrationResult,
			memberId: member.memberId,
			nameMember,
			timeZone,
			replacerName,
			replacerBuilding,
			replacerConfirmationUrl,
			replacerDateTime,
			replacerTelephoneCompany,
		});

		await sendLineToAdminAfterRegistrationEvent({
			registrationResult,
			nameMember,
			phoneMember,
		});

		SocketServerService.emitRegistration({
			memberId: member.memberId,
			categoryId: registrationResult.categoryId,
			occasionId: registrationResult.occasionId,
			occurrenceId,
		});
	}

	return registrationResult;
};

export const memberRegisterForCampaignEvent = async (
	{
		occurrenceId,
		member,
		message = '',
		dataNote = null,
		isManual = false,
		dataFiles,
	}: {
		occurrenceId: number;
		member: Member;
		message?: string;
		dataNote?: any;
		isManual?: boolean;
		dataFiles?: any;
	},
	transaction?: Transaction,
) => {
	const memberInfo = member.memberId ? member.toJSON() : (member as registrationMemberInfoType);

	const occurrence = await db.occurrences.findByPk(occurrenceId, {
		include: [
			{
				association: db.occurrences.associations.registrations,
				attributes: ['expected'],
			},
			{
				required: true,
				association: db.occurrences.associations.Campaign,
				attributes: ['title', 'isMultiEvent', 'startRegistration', 'endRegistration', 'isRegisterMultipleTimes'],
				include: [
					{
						association: db.campaigns.associations.categoryImages,
					},
					{
						association: db.campaigns.associations.categoryDetails,
					},
				],
			},
		],
		transaction,
	});

	if (occurrence == null) {
		throw new AppError(SYSTEM_ERROR, `occurrence ${occurrenceId} does not exist`);
	}
	const registrations: any = await db.registrations.findAll({
		where: {
			memberId: member.memberId,
			campaignId: {
				[Op.not]: null,
			},
		},
		include: [
			{
				association: db.registrations.associations.Campaign,
			},
			{
				association: db.registrations.associations.Occasion,
			},
			{
				association: db.registrations.associations.Occurrence,
			},
		],
	});
	if (moment(occurrence?.endAt).isBefore(moment())) {
		throw new AppError(CONFLICT_ERROR, 'endAt isBefore date now');
	}

	const occurrenceStartRegistration = moment(occurrence?.Campaign?.startRegistration);
	const occurrenceEndRegistration = moment(occurrence?.Campaign?.endRegistration);

	if (moment().isBefore(occurrenceStartRegistration) || moment().isAfter(occurrenceEndRegistration)) {
		throw new AppError(SYSTEM_ERROR, 'Invalid registration time');
	}

	registrations.forEach((item: any) => {
		if (!occurrence?.Campaign?.isRegisterMultipleTimes && item?.occurrenceId == occurrenceId) {
			throw new AppError(BAD_REQUEST, 'Duplicate event registrations are not allowed');
		}
		if (!item?.Campaign?.isMultiEvent) {
			throw new AppError(BAD_REQUEST, '時間の重複ですので、予約できません');
		}
	});

	const sum = occurrence.registrations!.reduce((p, c) => (p += c.expected), 0);
	if (!isManual && occurrence.maxAttendee < sum + 1) {
		throw new AppError(CONFLICT_ERROR, `occurrence ${occurrenceId} is full`);
	}

	const questions = await db.campaignQuestions.findAll({
		where: {
			campaignId: occurrence?.campaignId,
		},
		include: {
			association: db.campaignQuestions.associations.campaignChoices,
		},
		order: [['showOrder', 'asc']],
	});
	const dataCampaignQuestions: any = {};

	!isManual &&
		questions?.forEach((item) => {
			const column = `campaignQuestionId${item?.campaignQuestionId}`;

			const dataColumn = dataNote[column];

			if (item?.required && !dataColumn) {
				throw new AppError(BAD_REQUEST, 'required is not null');
			}

			switch (item.type) {
				case 'checkbox': {
					const selectId = dataColumn;

					let campaignChoiceContents: any;
					if (selectId) {
						const selectCheckbox = item.campaignChoices?.filter((item) => {
							return selectId.includes(item.campaignChoiceId);
						});

						campaignChoiceContents = selectCheckbox?.map((i: any) => i.contents);
					}

					dataCampaignQuestions[column] = campaignChoiceContents?.length ? campaignChoiceContents?.join(', ') : null;

					break;
				}
				case 'image': {
					let files: any;
					if (Array.isArray(dataFiles)) {
						const name = dataColumn;

						if (name) {
							files = dataFiles.find((item) => item?.originalname === name);
						}
					}
					dataCampaignQuestions[column] = files ? files.filename : null;

					break;
				}
				default:
					throw new AppError(SYSTEM_ERROR, 'data error', false);
			}
		});

	const registration = await db.registrations.create(
		{
			memberId: memberInfo.memberId ?? null,
			expected: 1,
			campaignId: occurrence.campaignId,
			occasionId: occurrence.occasionId,
			occurrenceId: occurrence.occurrenceId,
			message: message,
			note: dataCampaignQuestions,
			isRegistered: member.isRegistered,
			isFriends: member.isFriends,
			isManual: isManual,
		},
		{ transaction },
	);

	return {
		occasionId: occurrence.occasionId,
		campaignId: occurrence.campaignId,
		memberId: member.memberId,
		startAt: occurrence.startAt,

		registrationId: registration.registrationId,
		categoryTitle: occurrence?.Campaign?.title,
		categoryImages: occurrence?.Campaign?.categoryImages,
	} as registrationEmitType & {
		startAt: Date;
		registrationId: number;
		categoryTitle: string;
		isSettingTime?: boolean;
		categoryImages?: string[];
	};
};

export const updateIsNotified = async (
	registrationId: number,
	type: Partial<REMINDER_NOTIFY_TYPES>,
	transaction?: Transaction,
) => {
	let dataUpdate: Record<string, Date> = { isNotified1: new Date() };
	if (type === REMINDER_NOTIFY_TYPES.another_day) {
		dataUpdate = { isNotified2: new Date() };
	}
	return db.registrations.update(dataUpdate, {
		where: { registrationId },
		transaction,
	});
};

const checkIfBookingBeforeDeadline = (deadlineSettings: bookingDeadlineType | null, startTime: Date) => {
	if (deadlineSettings == null || deadlineSettings.isEnabled == false) {
		return true;
	}
	const now = moment();
	const deadline = moment(startTime).subtract(deadlineSettings.days, 'days').set({
		hour: deadlineSettings.hours,
		minute: deadlineSettings.minutes,
		second: 0,
	});
	return now.isBefore(deadline);
};

export const updateIsWin = (listId: number[], campaignId: number, transaction?: Transaction) => [
	db.registrations.update(
		{ isWin: true },
		{
			where: {
				registrationId: {
					[Op.in]: listId,
				},
				campaignId,
			},
			transaction,
		},
	),
	db.registrations.findAll({
		where: {
			registrationId: {
				[Op.in]: listId,
			},
			campaignId: campaignId,
			isWin: false,
		},
		include: {
			association: db.registrations.associations.Member,
		},
		transaction,
	}),
];

type TConfirmationRegistrationData = {
	registrationId: number;
	actualCompanionCount: number;
	actualParticipantCount: number;
};
export const confirmationRegistration = async (data: TConfirmationRegistrationData) => {
	const transaction = await db.sequelize.transaction();
	const { registrationId, actualCompanionCount, actualParticipantCount } = data;

	try {
		const registration = await db.registrations.findByPk(registrationId, {
			include: [
				{
					association: db.registrations.associations.Category,
				},
				{
					association: db.registrations.associations.Occurrence,
				},
			],
		});

		if (!registration) {
			throw new AppError(BAD_REQUEST, 'Registration not found', false);
		}

		await registration.update(
			{
				actualCompanionCount,
				actualParticipantCount,
				attended: 1,
			},
			{
				transaction,
			},
		);

		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		return Promise.reject(error);
	}
};

type TUpdateCountRegistration = {
	registrationId: number;
	participantCount: number;
	companionCount: number;
};
export const updateCountRegistration = async (data: TUpdateCountRegistration) => {
	const transaction = await db.sequelize.transaction();
	const { registrationId, participantCount, companionCount } = data;

	try {
		const registrations = await db.registrations.findByPk(registrationId, {
			include: [
				{
					association: db.registrations.associations.Category,
				},
				{
					association: db.registrations.associations.Occasion,
				},
				{
					association: db.registrations.associations.Occurrence,
				},
			],
		});
		if (!(registrations?.Category?.groupBooking || registrations?.Occasion?.groupBooking)) {
			throw new AppError(BAD_REQUEST, 'data error', false);
		}
		await db.registrations.update(
			{
				participantCount,
				companionCount,
				actualCompanionCount: null,
				actualParticipantCount: null,
				attended: 0,
				expected: participantCount + companionCount,
			},
			{
				where: {
					registrationId,
				},
				transaction,
			},
		);

		SocketServerService.emitRegistration({
			memberId: null,
			occasionId: null,
			occurrenceId: registrations?.Occurrence?.occurrenceId,
		});

		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
	}
};
