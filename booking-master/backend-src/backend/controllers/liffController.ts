import { FlexContainer } from '@line/bot-sdk';
import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { get, set, keyBy } from 'lodash';
import moment from 'moment';
import 'moment-timezone';
import { CreationAttributes, Op, QueryTypes, Transaction, UniqueConstraintError, WhereAttributeHash } from 'sequelize';

import {
	BAD_REQUEST,
	CONFLICT_ERROR,
	DAYS_REMINDER,
	REMINDER_NOTIFY_TYPES,
	RESPONSE_SUCCESS,
	SYSTEM_ERROR,
	TIME_ZONE_DEFAULT,
	WATCH_MESSAGE_KEY_CAMPAIGN_APPLY,
	WATCH_MESSAGE_KEY_MEMBER,
	WATCH_MESSAGE_KEY_REGISTRATION,
	WATCH_MESSAGE_KEY_REGISTRATION_CANCEL,
	systemConfig,
} from '../config';
import { db } from '../models/index';
import { Member } from '../models/memberModel';
import {
	CampaignService,
	CategoryService,
	GiftService,
	LineService,
	memberFriendAddService,
	MemberService,
	OccasionService,
	RegistrationService,
	ReminderService,
	SettingService,
	SocketServerService,
	SpectatorService,
} from '../services';
import { AppError, writeLog } from '../utilities';
import { isDateAfterOrEqualDays } from '~utilities/commonDateTime';
import { redisCacheService } from '~services/redisCacheService';

const replacerName = new RegExp(/\[NAME\]/, 'gm');
const replacerDateTime = new RegExp(/\[DATE\]/, 'gm');
const replacerTelephone = new RegExp(/\[TEL\]/, 'gm');
const replacerTelephoneCompany = new RegExp(/\[COMPANY-TEL\]/, 'gm');
const replacerConfirmationUrl = new RegExp(/\[CONFIRM-URL\]/, 'gm');
const replacerBuilding = new RegExp(/\[BUILDING\]/, 'gm');

export const setPersonalInfo = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const { firstName, lastName, firstNameKana, lastNameKana, email, telephone, postalCode, building, address } =
		req.body as CreationAttributes<Member> & { kids: string };
	try {
		transaction = await db.sequelize.transaction();
		if (!(telephone && firstName && lastName && firstNameKana && lastNameKana)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const member = await MemberService.findMemberByLineProfile(res.locals.memberLine, transaction);
		if (email) {
			const otherEmails = await MemberService.countOtherMemberByEmail(member.memberId, email);
			if (otherEmails > 0) {
				throw new AppError(CONFLICT_ERROR, 'email is already taken', false);
			}
		}
		const memberCode = `45${moment().format('YYYYMMDD')}${member.memberId.toString().padStart(10, '0')}`;
		if (member.memberCode == null) member.set({ memberCode: memberCode });
		if (member.memberSince == null) member.set({ memberSince: new Date() });
		if (!member.isRegistered) member.set({ isRegistered: true });
		if (firstName != undefined) member.set({ firstName: firstName });
		if (lastName != undefined) member.set({ lastName: lastName });
		if (firstNameKana != undefined) member.set({ firstNameKana: firstNameKana });
		if (lastNameKana != undefined) member.set({ lastNameKana: lastNameKana });
		if (telephone != undefined) member.set({ telephone: telephone });
		if (email != undefined) member.set({ email: email });
		if (postalCode != undefined) member.set({ postalCode: postalCode });
		if (building != undefined) member.set({ building: building });
		if (address != undefined) member.set({ address: address });
		if (member.memberCode == null) member.set({ memberCode: memberCode });
		if (member.isRegistered && member.lineId && member.curRM != 'memberRM') {
			member.set({ curRM: 'memberRM' });
			await MemberService.setRichmenuOfMember({ member, type: 'memberRM' }, transaction);
		}
		member.set({ isFriends: true });
		if (member.changed()) await member.save({ transaction });

		if (moment().subtract(5, 'seconds').isBefore(member.createdAt)) {
			const memberSpectators = await SpectatorService.listSpectatorsByWatch('member', transaction);
			if (memberSpectators.length > 0) {
				const spectatorLineIds = memberSpectators.map((mS) => mS.Member.lineId as string);
				const watchMessageTemplate = await SettingService.getSpectatorNotificationTemplate(
					WATCH_MESSAGE_KEY_MEMBER,
					transaction,
				);
				if (watchMessageTemplate && watchMessageTemplate.valueString) {
					let watchMessage = watchMessageTemplate.valueString.replace(
						replacerName,
						`${member!.lastName} ${member!.firstName}`,
					);
					watchMessage = watchMessage.replace(replacerTelephone, `${member.telephone ?? ''}`);
					await LineService.sendMulticastMessage(spectatorLineIds, watchMessage).catch((err) =>
						writeLog(`failed to send multicast message member watch ${err.message}`, 'info'),
					);
				}
			}
		}
		await transaction.commit();
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

export const setPersonalInfoNew = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	const dataBody: any = req.body;

	try {
		transaction = await db.sequelize.transaction();
		const customerRegistrations = await db.customerRegistrations.findAll({
			where: {
				isDisplayed: true,
			},
			include: {
				association: db.customerRegistrations.associations.campaignChoices,
				attributes: { exclude: ['customerRegistrationId', 'campaignQuestionId'] },
			},
			order: [['showOrder', 'asc']],
		});
		if (!Array.isArray(customerRegistrations)) throw new AppError(SYSTEM_ERROR, 'not setting', false);

		if (
			Array.isArray(req.files) &&
			req.files?.length > customerRegistrations?.filter((item) => item.type === 'image')?.length
		) {
			throw new AppError(SYSTEM_ERROR, 'image error', false);
		}

		const member = await MemberService.findMemberByLineProfile(res.locals.memberLine, transaction);

		const memberCode = `45${moment().format('YYYYMMDD')}${member.memberId.toString().padStart(10, '0')}`;
		if (member.memberCode == null) member.set({ memberCode: memberCode });
		if (member.memberSince == null) member.set({ memberSince: new Date() });
		if (!member.isRegistered) member.set({ isRegistered: true });
		if (member.isRegistered && member.lineId && member.curRM != 'memberRM') {
			member.set({ curRM: 'memberRM' });
			await MemberService.setRichmenuOfMember({ member, type: 'memberRM' }, transaction);
		}

		if (member.lineId) {
			const memberFriendAdded = await memberFriendAddService.getMemberFriendAddedDateByLineId(member.lineId);
			if (memberFriendAdded) {
				member.set({ friendAddedDate: memberFriendAdded.addedDate });
			}
		}

		const arrayIsDelete: number[] = [];
		const dataMember: any = {};

		customerRegistrations.forEach((item) => {
			const column = `customerRegistrationId${item?.customerRegistrationId}`;
			const data = get(dataBody, column);

			if (item?.required) {
				if (!data) {
					throw new AppError(BAD_REQUEST, `${item.label} not null`, false);
				}
				if (item.isDelete) {
					arrayIsDelete.push(item.customerRegistrationId);
				}
			}
			if (!item?.required) {
				if (data && item.isDelete) {
					arrayIsDelete.push(item.customerRegistrationId);
				}
			}

			const setData = (data: any) => {
				set(dataMember, column, data);
			};

			switch (item.type) {
				case 'text':
					setData(data?.trim() || null);
					break;
				case 'number':
					if (data || data === 0) {
						const valueNumber = data;

						if (!valueNumber || isNaN(valueNumber)) {
							throw new AppError(BAD_REQUEST, 'validate number', false);
						}
						setData(valueNumber);
					} else {
						setData(null);
					}

					break;
				case 'datepicker':
					if (data) {
						const isValid = !isNaN(new Date(data).getTime());
						if (!isValid) {
							throw new AppError(BAD_REQUEST, 'validate datepicker', false);
						}
					}

					setData(data || null);
					break;
				case 'checkbox': {
					if (data && data !== 'undefined') {
						const dataParsed = JSON.parse(data);
						const dataMap = keyBy(dataParsed, 'checked');

						const selectCheckbox = item.campaignChoices?.filter((item) => dataMap[item.campaignChoiceId]);

						if (item?.required && !selectCheckbox?.length) {
							throw new AppError(BAD_REQUEST, 'validate checkbox', false);
						}

						const campaignChoiceContents = (selectCheckbox || [])
							.map((r) => r.toJSON())
							.map(({ campaignChoiceId, contents, type }) => ({
								checked: campaignChoiceId,
								value: type === 'other' ? get(dataMap, campaignChoiceId).value : contents,
							}));

						setData(campaignChoiceContents.length ? JSON.stringify(campaignChoiceContents) : null);
					}
					break;
				}
				case 'radio': {
					if (data && data !== 'undefined') {
						const dataParsed = JSON.parse(data);
						const campaignChoiceId = get(dataParsed, 'checked');

						const selectRadio: any = item.campaignChoices?.find(
							(item) => item.campaignChoiceId === Number(campaignChoiceId),
						);

						if (item?.required && !selectRadio) {
							throw new AppError(BAD_REQUEST, 'validate radio', false);
						}

						if (selectRadio) {
							setData(
								JSON.stringify({
									checked: campaignChoiceId,
									value: selectRadio.type === 'other' ? get(dataParsed, 'value') : get(selectRadio, 'contents'),
								}),
							);
						}
					}
					break;
				}
				case 'image':
					if (item?.required) {
						if (!Array.isArray(req.files)) {
							throw new AppError(BAD_REQUEST, 'validate date', false);
						}
						const name = data;
						const files = req.files.find((item) => item?.originalname === name);

						if (!files || !name) {
							throw new AppError(BAD_REQUEST, 'validate date', false);
						}

						setData(files.filename);
					} else {
						let files: any;
						if (Array.isArray(req.files)) {
							const name = data;
							if (name) {
								files = req.files.find((item) => item?.originalname === name);
							}
						}
						setData(files ? files.filename : null);
					}
					break;
				default:
					throw new AppError(SYSTEM_ERROR, 'data error', false);
			}
		});

		let updateQuery = 'UPDATE members SET';
		Object.keys(dataMember)?.forEach((item, index) => {
			if (Object.keys(dataMember)?.length === index + 1) {
				updateQuery += ` ${item} = :${item}`;
				return;
			}
			updateQuery += ` ${item} = :${item},`;
		});
		updateQuery += ' WHERE memberId = :memberId';

		await db.sequelize.query(updateQuery, {
			replacements: { ...dataMember, memberId: member.memberId },
			type: QueryTypes.UPDATE,
			transaction,
		});

		member.set({ isFriends: true });
		if (member.changed()) await member.save({ transaction });

		if (arrayIsDelete.length > 0) {
			await db.customerRegistrations.update(
				{ isDelete: false },
				{
					where: {
						customerRegistrationId: arrayIsDelete,
					},
					transaction,
				},
			);
		}

		if (moment().subtract(5, 'seconds').isBefore(member.createdAt)) {
			const memberSpectators = await SpectatorService.listSpectatorsByWatch('member', transaction);
			if (memberSpectators.length > 0) {
				const spectatorLineIds = memberSpectators.map((mS) => mS.Member.lineId as string);
				const watchMessageTemplate = await SettingService.getSpectatorNotificationTemplate(
					WATCH_MESSAGE_KEY_MEMBER,
					transaction,
				);
				if (watchMessageTemplate && watchMessageTemplate.valueString) {
					let watchMessage = watchMessageTemplate.valueString.replace(
						replacerName,
						`${get(member, 'dataValues.customerRegistrationId1', '')}`,
					);
					watchMessage = watchMessage.replace(
						replacerTelephone,
						`${get(member, 'dataValues.customerRegistrationId2', '')}`,
					);
					await LineService.sendMulticastMessage(spectatorLineIds, watchMessage).catch((err) =>
						writeLog(`failed to send multicast message member watch ${err.message}`, 'info'),
					);
				}
			}
		}
		await Promise.all(
			customerRegistrations?.map((item) => {
				return db.sequelize.query(
					`SELECT customerRegistrationId${item?.customerRegistrationId} as '${item?.customerRegistrationId}' FROM members WHERE customerRegistrationId${item?.customerRegistrationId} IS NOT NULL LIMIT 1`,
					{
						type: QueryTypes.SELECT,
						plain: true,
						transaction,
					},
				);
			}),
		)
			.then(async (res) => {
				const arrayIds: Array<number> = [];
				res?.forEach((i) => {
					if (i && typeof i === 'object') {
						arrayIds?.push(Number(Object.keys(i)?.[0]));
					}
				});

				if (arrayIds?.length > 0) {
					await db.customerRegistrations.update(
						{ isDelete: true },
						{
							where: {
								customerRegistrationId: {
									[Op.notIn]: arrayIds,
								},
							},
							transaction: transaction,
						},
					);
				}
			})
			.catch((e) => {
				throw new AppError(SYSTEM_ERROR, 'error update isDelete', false);
			});

		await transaction.commit();
		SocketServerService.emitMemberUpdated({ ...member.toJSON(), ...dataMember });
		res.locals.memberLine = { ...res.locals.memberLine, ...dataMember };
		res.sendStatus(RESPONSE_SUCCESS);
		next();
	} catch (e) {
		console.log(e);

		if (transaction != null) {
			await transaction.rollback();
		}
		if (Array.isArray(req.files) && req.files?.length) {
			req.files?.forEach((item) => {
				if (fs.existsSync(item?.path)) {
					fs.unlinkSync(item?.path);
				}
			});
		}
		if (e instanceof UniqueConstraintError) {
			res.sendStatus(CONFLICT_ERROR);
		} else {
			next(e);
		}
	}
};

export const getPersonalInfo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const member = await MemberService.findMemberByLineProfile(res.locals.memberLine, undefined, true);
		if (member.isFriends == false) {
			await member.update({ isFriends: true });
		}
		const { lineId, candidateAt, curRM, isFriends, unreadCount, ...resMember } = member.toJSON();
		res.send({
			...resMember,
			memberId: member.memberId,
			memberSince: member.memberSince,
			memberCode: member.memberCode,
			picUrl: member.picUrl,
			displayName: member.displayName,
			firstName: member.firstName,
			lastName: member.lastName,
			firstNameKana: member.firstNameKana,
			lastNameKana: member.lastNameKana,
			address: member.address,
			email: member.email,
			telephone: member.telephone,
			postalCode: member.postalCode,
			building: member.building,
			isRegistered: member.isRegistered,
			isCampaign: member.isCampaign,
			memberInfo: member?.memberInfo,
		});
	} catch (e) {
		console.log(e);

		if (e instanceof UniqueConstraintError) {
			res.sendStatus(CONFLICT_ERROR);
		} else {
			next(e);
		}
	}
};

export const applyToCampaign = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const answers = req.body.answers as undefined | { campaignQuestionId: number; contents: string }[];
		if (!(answers && Array.isArray(answers) && answers.length)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		transaction = await db.sequelize.transaction();
		const member = await MemberService.findMemberByLineProfile(res.locals.memberLine, transaction);
		if (member.isCampaign) {
			throw new AppError(CONFLICT_ERROR, `member ${member.memberId} already applied to campaign`);
		} else {
			member.set({ isCampaign: true });
		}

		const campaignAnswers = await CampaignService.getCampaignAnswers(member.memberId, transaction);
		if (campaignAnswers.length > 0) {
			throw new AppError(CONFLICT_ERROR, `member ${member.memberId} already applied to campaign`);
		}

		await CampaignService.answerToQuestions(member.memberId, answers, transaction);
		await member.save({ transaction });
		// eslint-disable-next-line prefer-const
		let { campaignApplyMessage, companyTelephone } = await SettingService.getCampaignApplyMessage(transaction);
		if (campaignApplyMessage && member.lineId) {
			campaignApplyMessage = campaignApplyMessage.replace(replacerName, `${member!.lastName} ${member!.firstName}`);
			campaignApplyMessage = campaignApplyMessage.replace(replacerTelephoneCompany, `${companyTelephone ?? ''}`);
			await LineService.sendTextMessage(member.lineId, campaignApplyMessage).catch((err) =>
				writeLog(
					`failed to send message on apply campaign ${member.memberId}, ${member.isFriends} ${err.message}`,
					'info',
				),
			);
		}
		const campaignSpectators = await SpectatorService.listSpectatorsByWatch('campaign', transaction);
		if (campaignSpectators.length > 0) {
			const spectatorLineIds = campaignSpectators.map((mS) => mS.Member.lineId as string);
			const watchMessageTemplate = await SettingService.getSpectatorNotificationTemplate(
				WATCH_MESSAGE_KEY_CAMPAIGN_APPLY,
				transaction,
			);
			if (watchMessageTemplate && watchMessageTemplate.valueString) {
				let watchMessage = watchMessageTemplate.valueString.replace(
					replacerName,
					`${member.lastName} ${member.firstName}`,
				);
				watchMessage = watchMessage.replace(replacerTelephone, `${member.telephone ?? ''}`);
				await LineService.sendMulticastMessage(spectatorLineIds, watchMessage).catch((err) =>
					writeLog(`failed to send multicast message member watch ${err.message}`, 'info'),
				);
			}
		}
		await transaction.commit();
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
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
		await MemberService.findMemberByLineProfile(res.locals.memberLine)
			.then((member) => RegistrationService.getRegistration_Member(registrationId, member.memberId))
			.then((registrations) => {
				if (registrations == null) {
					throw new AppError(SYSTEM_ERROR, `registration ${registrationId} not found`);
				}
				res.send(registrations);
			});
	} catch (e) {
		console.log(e);

		next(e);
	}
};
export const getCampaignRegistration = async (req: Request, res: Response, next: NextFunction) => {
	const registrationId = parseInt(req.params.registrationId);
	try {
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}

		await MemberService.findMemberByLineProfile(res.locals.memberLine)
			.then((member) => RegistrationService.getRegistrationMember(registrationId, member.memberId))
			.then((registrations) => {
				if (registrations == null) {
					throw new AppError(SYSTEM_ERROR, `registration ${registrationId} not found`);
				}

				res.send(registrations);
			});
	} catch (e) {
		console.log(e);

		next(e);
	}
};

export const getRegistrations = async (req: Request, res: Response, next: NextFunction) => {
	try {
		await MemberService.findMemberByLineProfile(res.locals.memberLine)
			.then((member) =>
				RegistrationService.listMemberRegistrations(
					{ memberId: member.memberId },
					{ startAt: { [Op.gte]: moment().startOf('days').toDate() } },
				),
			)
			.then((registrations) => res.send(registrations));
	} catch (e) {
		console.log(e);

		next(e);
	}
};

export const getCampaignRegistrations = async (req: Request, res: Response, next: NextFunction) => {
	try {
		await MemberService.findMemberByLineProfile(res.locals.memberLine)
			.then((member) => RegistrationService.listMemberCampaignRegistrations({ memberId: member.memberId }, {}))
			.then((registrations) => res.send(registrations));
	} catch (e) {
		console.log(e);

		next(e);
	}
};

export const browseCategories = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const condition: paginationParams = {
			pp: parseInt(req.query.pp as string) || 20,
			p: parseInt(req.query.p as string) || 1,
			sort: (req.query.sort as string as 'asc' | 'desc' | null) || 'asc',
			sortKey: (req.query.sortKey as string) || 'showOrder',
		};
		const categoryWhere: WhereAttributeHash = {
			isDisplayed: true,
		};
		if (req.query.title) {
			categoryWhere.title = { [Op.substring]: req.query.title };
		}
		await CategoryService.browseCategories_Member(condition, categoryWhere).then((categoryCountRows) =>
			res.send({ ...condition, ...categoryCountRows }),
		);
	} catch (e) {
		next(e);
	}
};

export const detailCategory_Member = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const categoryId = parseInt(req.params.categoryId);
		if (!categoryId || isNaN(categoryId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const from = req.query.from ? moment(req.query.from as string) : moment().startOf('month').toDate();
		const to = req.query.to ? moment(req.query.to as string) : moment().endOf('month').toDate();
		const categoryWhere = {
			categoryId,
		};
		const occurrenceWhere = {
			categoryId,
			startAt: { [Op.between]: [from, to] },
			// isDisplayed: true
		};
		const bookingLimit = await SettingService.getBookingDeadline();
		if (bookingLimit && bookingLimit.isEnabled) {
			const now = moment();
			const deadlineTime = moment().set({ hour: bookingLimit.hours, minutes: bookingLimit.minutes, seconds: 0 });
			let newStartFrom = null;
			if (now.isAfter(deadlineTime)) {
				newStartFrom = moment()
					.startOf('day')
					.add(bookingLimit.days + 1, 'day')
					.toDate();
			} else {
				newStartFrom = moment().startOf('day').add(bookingLimit.days, 'day').toDate();
			}
			occurrenceWhere.startAt = { [Op.between]: [newStartFrom, to] };
		}
		const categoryDetail = await CategoryService.detailCategory_Member(categoryWhere, true, occurrenceWhere);
		res.send(categoryDetail);
	} catch (e) {
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
		const campaignWhere: WhereAttributeHash = {
			isDisplayed: true,
		};
		if (req.query.title) {
			campaignWhere.title = { [Op.substring]: req.query.title };
		}
		await MemberService.findMemberByLineProfile(res.locals.memberLine).then((member) =>
			CampaignService.browseCampaignsMember({
				pagination: condition,
				campaignWhere,
				memberId: member?.memberId,
			}).then((campaignCountRows) => res.send({ ...condition, ...campaignCountRows })),
		);
	} catch (e) {
		next(e);
	}
};

export const detailCampaignMember = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const campaignId = parseInt(req.params.campaignId);
		if (!campaignId || isNaN(campaignId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}

		const campaignWhere = {
			campaignId,
		};
		const occurrenceWhere = {
			campaignId,
			isDisplayed: true,
		};
		const campaignDetail = await CampaignService.detailCampaignMember(campaignWhere, true, occurrenceWhere);
		res.send(campaignDetail);
	} catch (e) {
		console.log(e);

		next(e);
	}
};

export const browseOccasion_Member = async (req: Request, res: Response, next: NextFunction) => {
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
		await OccasionService.browseOccasions_Member(
			categoryId,
			condition,
			{ isDisplayed: true },
			{ isDisplayed: true },
		).then((occasions) => res.send({ ...condition, ...occasions }));
	} catch (e) {
		next(e);
	}
};

export const browseGiftMember = async (req: Request, res: Response, next: NextFunction) => {
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
		await GiftService.browseGiftsMember(campaignId, condition, { isDisplayed: true }).then((occasions) =>
			res.send({ ...condition, ...occasions }),
		);
	} catch (e) {
		next(e);
	}
};

export const detailOccasion_Member = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const occasionId = parseInt(req.params.occasionId);
		if (!occasionId || isNaN(occasionId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid occasionId', false);
		}
		const from = req.query.from ? moment(req.query.from as string) : moment().toDate();
		const to = req.query.to ? moment(req.query.to as string) : moment().endOf('month').toDate();
		const occasionWhere = {
			occasionId: occasionId,
		};

		const occurrenceWhere = {
			occasionId: occasionId,
			startAt: { [Op.between]: [from, to] },
			isDisplayed: true,
		};
		const bookingLimit = await SettingService.getBookingDeadline();
		if (bookingLimit && bookingLimit.isEnabled) {
			const now = moment();
			const deadlineTime = moment().set({ hour: bookingLimit.hours, minutes: bookingLimit.minutes, seconds: 0 });
			let newStartFrom = null;
			if (now.isAfter(deadlineTime)) {
				newStartFrom = moment()
					.startOf('day')
					.add(bookingLimit.days + 1, 'day')
					.toDate();
			} else {
				newStartFrom = moment().startOf('day').add(bookingLimit.days, 'day').toDate();
			}
			occurrenceWhere.startAt = { [Op.between]: [newStartFrom, to] };
		}
		await OccasionService.detailOccasion_Member(occasionWhere, occurrenceWhere).then((occasionDetail) =>
			res.send(occasionDetail),
		);
	} catch (e) {
		next(e);
	}
};

export const registerForCampaignEvent = async (req: Request, res: Response, next: NextFunction) => {
	let transaction: Transaction | null = null;
	try {
		const { occurrenceId, message, timeZone, participantCount, companionCount, ...resData } = req.body as {
			occurrenceId: number;
			message: string;
			timeZone: string;
			participantCount: number;
			companionCount: number;
		};
		if (!occurrenceId || isNaN(occurrenceId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid occurrence ids', false);
		}
		transaction = await db.sequelize.transaction();

		const member = (await MemberService.findMemberByLineProfile(res.locals.memberLine, transaction)) as any;

		const registrationResult = await RegistrationService.memberRegisterForCampaignEvent(
			{
				occurrenceId,
				member,
				message,
				dataNote: resData,
				dataFiles: req.files,
			},
			transaction,
		);
		const messagesToClient = await SettingService.getRegistrationAndReminderMessages(transaction);

		const confirmationUrl = messagesToClient?.bookConfirmationUrl?.valueString ?? '';
		const companyTelephone = messagesToClient?.companyTelephoneForTemplate?.valueString ?? '';
		const buildingInfo = registrationResult?.categoryTitle;

		const memberInfo = member.memberId ? member.toJSON() : (member as registrationMemberInfoType);

		const name = memberInfo?.customerRegistrationId1;
		const phone = memberInfo?.customerRegistrationId2;

		if (
			messagesToClient.campaignregiMessage &&
			messagesToClient.campaignregiMessage.valueString &&
			registrationResult?.startAt &&
			member.lineId
		) {
			const urlDetail = `${process.env.SITE_URI}/liff/campaign-registrations/${process.env.LINE_LIFF_ID}?campaign-registrations=${registrationResult.registrationId}`;

			let campaignregiMessage = messagesToClient.campaignregiMessage.valueString.replace(replacerName, name ?? '');
			campaignregiMessage = campaignregiMessage.replace(
				replacerDateTime,
				registrationResult.startAt ? moment(registrationResult.startAt).format('YYYY年MM月DD日HH時mm分') : '',
			);
			campaignregiMessage = campaignregiMessage.replace(replacerTelephoneCompany, `${companyTelephone ?? ''}`);
			campaignregiMessage = campaignregiMessage.replace(replacerConfirmationUrl, '');
			campaignregiMessage = campaignregiMessage.replace(replacerBuilding, `${buildingInfo}`);

			const content: FlexContainer = {
				type: 'bubble',
				body: {
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'text',
							text: campaignregiMessage,
							wrap: true,
						},
					],
				},
				footer: {
					type: 'box',
					layout: 'vertical',
					contents: [
						{
							type: 'button',
							style: 'link',
							action: {
								type: 'uri',
								label: '確認する',
								uri: urlDetail,
							},
						},
					],
				},
			};

			await LineService.sendFlexMessage(member.lineId, content).catch((err) =>
				writeLog(`failed to send message on booking ${member.memberId}, ${member.isFriends} ${err.toString()}`, 'info'),
			);
		}

		const now = new Date();
		let remind1Time = moment(registrationResult.startAt).subtract(3, 'days').toDate();
		let remind2Time = moment(registrationResult.startAt).subtract(1, 'day').toDate();

		if (messagesToClient.remind1 && messagesToClient.remind1.valueString) {
			const before3Days = now.getTime() < remind1Time.getTime();
			const before1Days = now.getTime() < remind2Time.getTime();
			let isMakeReminder = false;
			if (before3Days) {
				isMakeReminder = true;
			} else if (before1Days) {
				remind1Time = now;
				isMakeReminder = true;
			}
			if (isMakeReminder) {
				remind1Time = now;
				await ReminderService.createReminder(
					{
						startAt: registrationResult?.startAt,
						remindDT: remind1Time,
						registrationId: registrationResult?.registrationId,
						memberId: member.memberId,
						message: messagesToClient.remind1.valueString,
						fullName: name ?? '',
						telephone: companyTelephone,
						confirmationUrl: confirmationUrl,
						key: 'isNotified1',
						buildingInfo: buildingInfo,
						timeZone: timeZone,
					},
					{
						replacerName,
						replacerBuilding,
						replacerConfirmationUrl,
						replacerDateTime,
						replacerTelephoneCompany,
					},
					transaction,
				);
			}
		}
		if (messagesToClient.remind2 && messagesToClient.remind2.valueString) {
			if (now.getTime() > remind2Time.getTime()) {
				remind2Time = now;
			}
			await ReminderService.createReminder(
				{
					startAt: registrationResult.startAt,
					remindDT: remind2Time,
					registrationId: registrationResult.registrationId,
					memberId: member.memberId,
					message: messagesToClient.remind2.valueString,
					fullName: name ?? '',
					telephone: companyTelephone,
					confirmationUrl: confirmationUrl,
					key: 'isNotified2',
					buildingInfo: buildingInfo,
					timeZone: timeZone,
				},
				{
					replacerName,
					replacerBuilding,
					replacerConfirmationUrl,
					replacerDateTime,
					replacerTelephoneCompany,
				},
				transaction,
			);
		}
		const registrationSpectators = await SpectatorService.listSpectatorsByWatch('registration', transaction);
		if (registrationSpectators.length > 0) {
			const spectatorLineIds = registrationSpectators.map((mS) => mS.Member.lineId as string);

			const watchMessageTemplate = await SettingService.getSpectatorNotificationTemplate(
				WATCH_MESSAGE_KEY_REGISTRATION,
			); //REGISTRATION_WATCH_MESSAGE;
			if (watchMessageTemplate && watchMessageTemplate.valueString) {
				let watchMessage = watchMessageTemplate.valueString.replace(replacerName, `${name ?? ''}`);
				watchMessage = watchMessage.replace(replacerBuilding, buildingInfo);
				watchMessage = watchMessage.replace(replacerTelephone, `${phone ?? ''}`);

				if (registrationResult.startAt) {
					watchMessage = watchMessage.replace(
						replacerDateTime,
						registrationResult.startAt ? moment(registrationResult.startAt).format('YYYY年MM月DD日HH時mm分') : '',
					);
				}
				await LineService.sendMulticastMessage(spectatorLineIds, watchMessage).catch((err) =>
					writeLog(`failed to send multicast message member watch ${err.message}`, 'info'),
				);
			}
		}

		SocketServerService.emitRegistration({
			memberId: member.memberId,
			campaignId: registrationResult.campaignId,
			occasionId: registrationResult.occasionId,
			occurrenceId,
		});
		await transaction.commit();
		res.send({ registrationId: registrationResult.registrationId });
	} catch (e) {
		console.log(e);

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

export const registerForEvent = async (req: Request, res: Response, next: NextFunction) => {
	const { occurrenceId, message, note, timeZone, participantName, participantCount, companionCount } = req.body as {
		occurrenceId: number;
		message: string;
		note: any;
		timeZone: string;
		participantName: string;
		participantCount: number;
		companionCount: number;
	};
	try {
		if (!occurrenceId || isNaN(occurrenceId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid occurrence ids', false);
		}

		const member = await MemberService.findMemberByLineProfile(res.locals.memberLine);

		const registrationResult = await RegistrationService.memberRegisterForEvent({
			occurrenceId,
			member,
			message,
			dataNote: note,
			participantName,
			participantCount,
			companionCount,
			timeZone,
		});

		res.send({ registrationId: registrationResult.registrationId });
	} catch (e: any) {
		console.log(e);
		if (!e?.message?.includes('does not exist')) {
			const occurrence = await db.occurrences.findByPk(occurrenceId, {
				include: [
					{
						association: db.occurrences.associations.Category,
						attributes: ['groupBooking'],
					},
				],
			});
			const totalClientAttendee = occurrence?.Category?.groupBooking ? participantCount + companionCount : 1;
			writeLog({ error: e, totalClientAttendee, occurrence }, 'info');
			await redisCacheService.decreaseOccurrenceRegisterCount(occurrenceId, totalClientAttendee);
		}

		if (e instanceof UniqueConstraintError) {
			res.sendStatus(CONFLICT_ERROR);
		} else {
			next(e);
		}
	}
};

export const cancelRegistration = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();

	try {
		const registrationId = parseInt(req.params.registrationId);
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid registrationId');
		}
		const member = (await MemberService.findMemberByLineProfile(res.locals.memberLine, transaction)) as any;
		const registrationResult = await RegistrationService.cancelRegistration(
			registrationId,
			member.memberId,
			false,
			transaction,
		);
		const memberInfo = member.memberId ? member.toJSON() : (member as registrationMemberInfoType);

		const nameMember = memberInfo?.customerRegistrationId1;
		const phoneNumber = memberInfo?.customerRegistrationId2;

		const registrationSpectators = await SpectatorService.listSpectatorsByWatch('registration', transaction);
		if (registrationSpectators.length > 0) {
			const spectatorLineIds = registrationSpectators.map((mS) => mS.Member.lineId as string);
			const watchMessageTemplate = await SettingService.getSpectatorNotificationTemplate(
				WATCH_MESSAGE_KEY_REGISTRATION_CANCEL,
			); //REGISTRATION_WATCH_MESSAGE;
			if (watchMessageTemplate && watchMessageTemplate.valueString) {
				let watchMessage = watchMessageTemplate.valueString.replace(
					replacerName,
					`${nameMember ?? ''}`,
					// `${member.lastName} ${member.firstName}`
				);
				watchMessage = watchMessage.replace(replacerBuilding, registrationResult.categoryTitle);
				watchMessage = watchMessage.replace(
					replacerTelephone,
					`${phoneNumber ?? ''}`,
					//  `${member.telephone ?? ''}`
				);
				if (registrationResult.startAt) {
					watchMessage = watchMessage.replace(
						replacerDateTime,
						registrationResult.startAt ? moment(registrationResult.startAt).format('YYYY年MM月DD日HH時mm分') : '',
					);
				}

				await LineService.sendMulticastMessage(spectatorLineIds, watchMessage).catch((err) =>
					writeLog(`failed to send multicast message member watch ${err.message}`, 'info'),
				);
			}
		}
		await ReminderService.destroyReminderByRegistrationId(registrationId, transaction);
		await transaction.commit();
		SocketServerService.emitRegistration({
			memberId: registrationResult.memberId,
			categoryId: registrationResult.categoryId,
			occasionId: registrationResult.occasionId,
		});
		if (registrationResult.occurrenceId != null) {
			await redisCacheService.decreaseOccurrenceRegisterCount(
				registrationResult.occurrenceId,
				registrationResult.expected,
			);
		}
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (transaction != null) {
			await transaction.rollback();
		}
		next(e);
	}
};

export const memberUpdateRegistrationAttended = async (req: Request, res: Response, next: NextFunction) => {
	const registrationId = parseInt(req.params.registrationId);
	const userId = res?.locals?.memberLine?.userId;

	try {
		if (!registrationId || isNaN(registrationId)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}

		const registration = await db.registrations.findOne({
			where: { registrationId: registrationId },
			include: [
				{
					required: true,
					association: db.registrations.associations.Category,
					where: {
						type: 'ticket',
					},
				},
				{
					required: true,
					association: db.registrations.associations.Member,
					where: {
						lineId: userId,
					},
				},
			],
		});
		if (registration == null) {
			throw new AppError(SYSTEM_ERROR, `registration ${registrationId} does not exist`, false);
		}
		if (registration?.attended) {
			throw new AppError(SYSTEM_ERROR, 'attended', false);
		}

		const update = await db.registrations.update({ attended: 1 }, { where: { registrationId: registrationId } });

		if (!update?.length) {
			throw new AppError(BAD_REQUEST, 'registrationId error', false);
		}

		SocketServerService.emitRegistration({
			memberId: registration.memberId,
			categoryId: registration.categoryId,
			occasionId: registration.occasionId,
			occurrenceId: registration.occurrenceId,
		});
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		console.log(e);

		next(e);
	}
};
