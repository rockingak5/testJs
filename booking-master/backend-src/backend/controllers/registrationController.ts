import { NextFunction, Request, Response } from 'express';
import json2csv from 'json2csv';
import { map, get } from 'lodash';
import moment from 'moment';
import { Op, Transaction, WhereAttributeHash, col } from 'sequelize';
import { formatDate } from '~utilities/commonDateTime';

import {
	BAD_REQUEST,
	CREATED,
	CUSTOMER_REGISTRATIONS_DEFAULT_FIELD,
	MEMBER_IS_FRIEND_LABEL,
	MEMBER_ORIGIN,
	MEMBER_VIA_TYPE,
	PERMISSION_ERROR,
	RESPONSE_SUCCESS,
	SYSTEM_ERROR,
} from '../config';
import { db } from '../models';
import { ManagerService, RegistrationService, ReminderService, SocketServerService, MemberService } from '../services';
import { AppError, comparePassword, generateWhereClauseBetween } from '../utilities';
import { redisCacheService } from '~services/redisCacheService';

export const createManualRegistration = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const {
			occurrenceId,
			lastName,
			firstName,
			lastNameKana,
			firstNameKana,
			email,
			telephone,
			postalCode,
			address,
			building,
			message,
		} = req.body as {
			occurrenceId: number;
			lastName: string;
			firstName: string;
			lastNameKana: string;
			firstNameKana: string;
			email?: string;
			telephone?: string;
			postalCode?: string;
			address?: string;
			building?: string;
			message?: string;
		};
		if (!occurrenceId || isNaN(occurrenceId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid occurrence ids', false);
		}
		const member = await db.members.create({
			lastName,
			firstName,
			lastNameKana,
			firstNameKana,
			email,
			telephone,
			postalCode,
			address,
			building,
			via: MEMBER_VIA_TYPE.OTHERS,
			origin: MEMBER_ORIGIN.SYSTEM,
		});

		// MemberService.createManualMember(guardianInfo, transaction);
		const socketNotifData = await RegistrationService.memberRegisterForEvent({
			occurrenceId,
			member,
			message,
			isManual: true,
		});
		if (socketNotifData != null) {
			SocketServerService.emitRegistration({
				memberId: member.memberId,
				categoryId: socketNotifData.categoryId,
				occasionId: socketNotifData.occasionId,
				occurrenceId: occurrenceId,
			});
		}
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		console.log(e);

		next(e);
	}
};

export const createCampaignManualRegistration = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const {
			occurrenceId,
			lastName,
			firstName,
			lastNameKana,
			firstNameKana,
			email,
			telephone,
			postalCode,
			address,
			building,
			message,
		} = req.body as {
			occurrenceId: number;
			lastName: string;
			firstName: string;
			lastNameKana: string;
			firstNameKana: string;
			email?: string;
			telephone?: string;
			postalCode?: string;
			address?: string;
			building?: string;
			message?: string;
		};
		if (!occurrenceId || isNaN(occurrenceId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid occurrence ids', false);
		}
		transaction = await db.sequelize.transaction();

		const member = await db.members.create(
			{
				lastName,
				firstName,
				lastNameKana,
				firstNameKana,
				email,
				telephone,
				postalCode,
				address,
				building,
				via: 'others',
			},
			{ transaction },
		);

		const socketNotifData = await RegistrationService.memberRegisterForCampaignEvent(
			{ occurrenceId, member, message, isManual: true },
			transaction,
		);
		await transaction.commit();
		if (socketNotifData != null) {
			SocketServerService.emitRegistration({
				memberId: member.memberId,
				campaignId: socketNotifData.campaignId,
				occasionId: socketNotifData.occasionId,
				occurrenceId: occurrenceId,
			});
		}
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		console.log(e);

		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const getRegistration = async (req: Request, res: Response, next: NextFunction) => {
	const registrationId = parseInt(req.params.registrationId);
	try {
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		await RegistrationService.getRegistration(registrationId).then((registration) => {
			if (registration == null) {
				throw new AppError(SYSTEM_ERROR, `registration ${registrationId} does not exist`, false);
			}
			res.send(registration);
		});
	} catch (e) {
		next(e);
	}
};

export const getCampaignRegistrations = async (req: Request, res: Response, next: NextFunction) => {
	const campaignId = parseInt(req.params.campaignId);

	try {
		if (!campaignId || isNaN(campaignId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		await RegistrationService.getCampaignRegistrations(campaignId).then((registration) => {
			if (registration == null) {
				throw new AppError(SYSTEM_ERROR, `campaignId ${campaignId} does not exist`, false);
			}
			res.send(registration);
		});
	} catch (e) {
		console.log(e);

		next(e);
	}
};

export const getAttended = async (req: Request, res: Response, next: NextFunction) => {
	const memberId = parseInt(req.params.memberId);
	try {
		if (!memberId || isNaN(memberId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const dataRegistrations = await RegistrationService.getAttended(memberId);
		res.send(dataRegistrations);
	} catch (e) {
		next(e);
	}
};

export const getCampaignsAttended = async (req: Request, res: Response, next: NextFunction) => {
	const memberId = parseInt(req.params.memberId);
	try {
		if (!memberId || isNaN(memberId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const dataRegistrations = await RegistrationService.getCampaignsAttended(memberId);
		res.send(dataRegistrations);
	} catch (e) {
		next(e);
	}
};

export const updateRegistration = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const registrationId = parseInt(req.body.registrationId);
	try {
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		const socketData = await RegistrationService.editRegistration(req.body, transaction);
		await transaction.commit().then(() => {
			SocketServerService.emitRegistration(socketData);
			res.sendStatus(RESPONSE_SUCCESS);
		});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const updateRegistrationAttended = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();

	const registrationId = parseInt(req.body.registrationId);
	try {
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}

		const registration = await db.registrations.findOne({
			where: { registrationId: registrationId },
			include: [
				{
					association: db.registrations.associations.Occurrence,
					attributes: ['categoryId', 'occasionId', 'occurrenceId'],
				},
			],
		});
		if (registration == null) {
			throw new AppError(SYSTEM_ERROR, `registration ${registrationId} does not exist`, false);
		}
		if (registration?.attended) {
			throw new AppError(SYSTEM_ERROR, 'attended', false);
		}

		await db.registrations.update({ attended: 1 }, { where: { registrationId: registrationId }, transaction });

		await transaction.commit();

		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		await transaction.rollback();

		next(e);
	}
};

export const cancelRegistration = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const registrationId = parseInt(req.params.registrationId);
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid registrationId');
		}

		transaction = await db.sequelize.transaction();
		try {
			const socketData = await RegistrationService.cancelRegistration(registrationId, undefined, true, transaction);
			await ReminderService.destroyReminderByRegistrationId(registrationId, transaction);
			await transaction.commit();
			if (socketData.occurrenceId != null) {
				await redisCacheService.decreaseOccurrenceRegisterCount(socketData.occurrenceId, socketData.expected);
			}
			SocketServerService.emitRegistration({
				memberId: socketData.memberId,
				categoryId: socketData.categoryId,
				occasionId: socketData.occasionId,
				occurrenceId: socketData.occurrenceId,
			});
			return res.sendStatus(RESPONSE_SUCCESS);
		} catch (error) {
			console.log(error);
		}
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const deleteRegistration = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const registrationId = parseInt(req.params.registrationId);
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid registrationId');
		}
		transaction = await db.sequelize.transaction();
		const socketData = await RegistrationService.deleteRegistration(registrationId, transaction);
		await transaction.commit().then(() => {
			SocketServerService.emitRegistration(socketData);
			res.sendStatus(RESPONSE_SUCCESS);
		});
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

async function getRegistrationCsvData({
	registrationWhere,
	occasionWhere,
	categoryWhere,
	occurrenceWhere,
}: {
	registrationWhere: WhereAttributeHash;
	occasionWhere: WhereAttributeHash;
	categoryWhere: WhereAttributeHash;
	occurrenceWhere: WhereAttributeHash;
}) {
	const customerRegistrations = await db.customerRegistrations.findAll({
		where: {
			isAdminDisplayed: true,
		},
		attributes: ['customerRegistrationId', 'type', 'label', 'name'],
		order: [['showOrder', 'asc']],
		raw: true,
	});
	const categoryCSVData: any[] = await RegistrationService.generateRegistrationDataForCSV({
		registrationWhere,
		occasionWhere,
		categoryWhere,
		customerRegistrations,
		occurrenceWhere,
	});
	const csvData = categoryCSVData.map((member) => {
		const isRegisterManually = member?.lineId;
		return MemberService.transformUserCsvData(member, customerRegistrations, {
			会員ID: `${member.memberId ?? ''}`,
			会員コード: member.memberCode ?? '',
			LINE名: member.displayName ?? '',
			LINEフォロー状態: `${member.isFriends ? MEMBER_IS_FRIEND_LABEL.IS_FRIEND : MEMBER_IS_FRIEND_LABEL.NOT_FRIEND}`,
			備考欄: isRegisterManually ? (get(member, 'notes', '') as string) : '',
			来店回数: isRegisterManually ? `${get(member, 'countVisit', 'ー')}回` : '',
			最終来店日: isRegisterManually ? formatDate(member?.lastVisit) : '',
			ポイント: isRegisterManually ? (get(member, 'currentPoints', '0') as string) : '',
			友だち登録日: isRegisterManually ? formatDate(member?.createdAt) : '',
			会員登録日: isRegisterManually ? formatDate(member?.memberSince) : '',
			有効期限: isRegisterManually ? formatDate(member?.activeUntil) : '',
			予約時間: `${member.startAt ? moment(member.startAt).format('YYYY年MM月DD日HH時mm分') : ''}`,
			親イベント名: member.categoryTitle,
			メッセージ: member.message,
			子イベント名: member.occasionTitle,
			...(!member.memberCode
				? {
						'【手入力】氏名（漢字）': `${member.lastName} ${member.firstName}`,
						'【手入力】氏名（フリガナ）': `${member.lastNameKana} ${member.firstNameKana}`,
						'【手入力】電話番号': member.telephone,
						'【手入力】メールアドレス': member.email,
						'【手入力】郵便番号': member.postalCode,
						'【手入力】住所1': member.address,
						'【手入力】住所2': member.building,
				  }
				: {}),
		});
	});
	const fields = [
		'会員ID',
		'会員コード',
		'LINE名',
		'LINEフォロー状態',
		'親イベント名',
		'子イベント名',
		'メッセージ',
		'予約時間',
		...map(customerRegistrations, (cR) => cR?.label),
		'備考欄',
		'来店回数',
		'最終来店日',
		'ポイント',
		'友だち登録日',
		'会員登録日',
		'有効期限',
		'【手入力】氏名（漢字）',
		'【手入力】氏名（フリガナ）',
		'【手入力】電話番号',
		'【手入力】メールアドレス',
		'【手入力】郵便番号',
		'【手入力】住所1',
		'【手入力】住所2',
	];
	const opts = { fields: fields, withBOM: true, excelStrings: true };
	const csv = json2csv.parse(csvData, opts);
	return csv;
}

export const generateCategoryRegistrationCSV = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const managerId = req.session.user?.id;
		const { categoryId, occasionId, from, to, password } = req.body;
		if (!managerId) {
			throw new AppError(PERMISSION_ERROR, 'no session', false);
		}
		if (!password || (!from && !to)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const manager = await ManagerService.getManager(managerId);
		if (manager == null) {
			throw new AppError(SYSTEM_ERROR, `manager ${managerId} does not exist`, false);
		}
		const isMatch = await comparePassword(password, manager.pwhash);
		if (!isMatch) {
			throw new AppError(PERMISSION_ERROR, 'invalid password', false);
		}
		const categoryWhere: WhereAttributeHash = {};
		if (categoryId) {
			categoryWhere.categoryId = categoryId;
		}
		const occasionWhere: WhereAttributeHash = {};
		if (occasionId) {
			occasionWhere.occasionId = occasionId;
		}
		const registrationWhere: WhereAttributeHash = {
			memberId: { [Op.not]: null },
			createdAt: { [Op.not]: null },
		};
		const occurrenceWhere: WhereAttributeHash = {
			...generateWhereClauseBetween('startAt', [from, to]),
		};
		const csvData = await getRegistrationCsvData({ registrationWhere, occasionWhere, categoryWhere, occurrenceWhere });
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename=registrations.csv');
		res.status(RESPONSE_SUCCESS).end(csvData);
	} catch (e) {
		next(e);
	}
};

export const getConfirmRegistration = async (req: Request, res: Response, next: NextFunction) => {
	const registrationId = parseInt(req.body.registrationId);

	try {
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(BAD_REQUEST, 'QR error', false);
		}
		const registration = await db.registrations.findOne({
			where: { registrationId },
			attributes: [
				//
				'message',
				'attended',
				'registrationId',
				'note',
				'isManual',
				'participantName',
				'participantCount',
				'companionCount',
				'actualParticipantCount',
				'actualCompanionCount',
				'cancelledAt',
			],
			include: [
				{
					association: db.registrations.associations.Member,
					attributes: [
						'lastName',
						'firstName',
						'lastNameKana',
						'firstNameKana',
						'telephone',
						'customerRegistrationId1',
						'customerRegistrationId2',
						'displayName',
					],
				},
				{
					association: db.registrations.associations.Occurrence,
					attributes: ['startDate', 'startAt', 'endAt'],
				},
				{
					association: db.registrations.associations.Category,
					attributes: ['title', 'groupBooking'],
					include: [
						{
							association: db.categories.associations.categoryImages,
							attributes: { exclude: ['categoryImageId', 'categoryId', 'campaignId'] },
							order: [[col('showOrder'), 'asc']],
						},
					],
				},
				{
					association: db.registrations.associations.Occasion,
					attributes: ['title', 'groupBooking'],
					include: [
						{
							association: db.occasions.associations.occasionImages,
							attributes: { exclude: ['occasionImageId', 'occasionId'] },
							order: [[col('showOrder'), 'asc']],
						},
					],
				},
			],
			paranoid: false,
		});
		if (!registration || registration?.cancelledAt) {
			throw new AppError(BAD_REQUEST, `registration ${registrationId} does not exist`, false);
		}
		res.send(registration);
	} catch (e) {
		next(e);
	}
};

export const updateIsWin = async (req: Request, res: Response, next: NextFunction) => {
	const registrationId = parseInt(req.body.registrationId);

	try {
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(BAD_REQUEST, 'registrationId error', false);
		}
		const registration = await db.registrations.update(
			{ isWin: false },
			{
				where: {
					registrationId,
				},
			},
		);

		res.send(registration);
	} catch (e) {
		next(e);
	}
};

export const confirmRegistration = async (req: Request, res: Response, next: NextFunction) => {
	const registrationId = req.params.registrationId as unknown as number;
	const { actualCompanionCount, actualParticipantCount } = req.body;

	try {
		await RegistrationService.confirmationRegistration({
			registrationId,
			actualCompanionCount,
			actualParticipantCount,
		});
		res.status(CREATED).json({
			message: 'Registration confirmed',
		});
	} catch (error) {
		next(error);
	}
};

export const updateCountRegistration = async (req: Request, res: Response, next: NextFunction) => {
	const registrationId = req.params.registrationId as unknown as number;
	const { participantCount, companionCount } = req.body;

	try {
		await RegistrationService.updateCountRegistration({
			registrationId,
			participantCount,
			companionCount,
		});
		res.status(RESPONSE_SUCCESS).json({
			message: 'Registration updated',
		});
	} catch (error) {
		next(error);
	}
};
