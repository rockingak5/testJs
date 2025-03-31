import json2csv from 'json2csv';
import _, { cloneDeep, get, isEmpty, map } from 'lodash';
import {
	Attributes,
	CreationAttributes,
	FindOptions,
	literal,
	Op,
	QueryTypes,
	Sequelize,
	Transaction,
	WhereAttributeHash,
} from 'sequelize';
import path = require('path');
import { SocketServerService } from '~services';
import moment from 'moment';
import { CampaignAnswer } from '~models/campaignAnswerModel';
import { CustomerRegistration } from '~models/customerRegistrationModel';
import { AppError, FileOps, generateWhereClauseBetween, buildPaginationParams, CommonUtils } from '~utilities';

import {
	BAD_REQUEST,
	CAMPAIGN_CHOICES_TYPE_OTHER,
	CONTENT_TYPE_SURVEY_OTHER,
	CUSTOMER_REGISTRATION_FIELD_IMAGE_LABEL,
	CUSTOMER_REGISTRATION_FIELD_TYPE,
	MEMBER_IS_FRIEND_LABEL,
	SORT,
	SYSTEM_ERROR,
	systemConfig,
} from '../config';
import { db } from '../models';
import { Member } from '../models/memberModel';
import { linkRichMenuToUser, unlinkRichMenuFromUser } from './lineService';
import { MemberSurveyReward } from '~models/memberSurveyRewardModel';
import { DrawModel } from '~models/draw.model';
import { formatDate } from '~utilities/commonDateTime';

type UpdateMember = Attributes<Member> & {
	pointIsAdd?: boolean;
	points?: number;
	isEditMember?: string;
};

export const transformUserCsvData = (
	member: Member,
	customerRegistrations: CustomerRegistration[],
	initValues: Record<string, string>,
): Record<string, string> => {
	if (!member?.lineId) return initValues;

	const data = cloneDeep(initValues);

	customerRegistrations?.length &&
		customerRegistrations.forEach((customerRegistration) => {
			if (customerRegistration?.type !== CUSTOMER_REGISTRATION_FIELD_TYPE.CHECKBOX) {
				const value = get(member, `customerRegistrationId${customerRegistration.customerRegistrationId}`, '');
				switch (customerRegistration?.type) {
					case CUSTOMER_REGISTRATION_FIELD_TYPE.DATE_PICKER:
						data[customerRegistration.label] = value ? moment(new Date(value)).format('YYYY-MM-DD') : '';
						break;

					case CUSTOMER_REGISTRATION_FIELD_TYPE.IMAGE:
						data[customerRegistration.label] = value
							? CUSTOMER_REGISTRATION_FIELD_IMAGE_LABEL.EXIST
							: CUSTOMER_REGISTRATION_FIELD_IMAGE_LABEL.NOT_EXIST;
						break;

					case CUSTOMER_REGISTRATION_FIELD_TYPE.RADIO:
						data[customerRegistration.label] = get(value, 'value', '');
						break;

					default:
						data[customerRegistration.label] = value;
						break;
				}
			} else {
				const values = get(member, `customerRegistrationId${customerRegistration.customerRegistrationId}`, []);
				data[customerRegistration?.label] = map(values, ({ value }) => value).join(',');
			}
		});
	if (member.campaignAnswers) {
		member.campaignAnswers.forEach((cA: CampaignAnswer) => {
			if (cA.CampaignQuestion) {
				data[cA.CampaignQuestion.contents] = cA.contents ?? '';
			}
		});
	}
	return data;
};

export const findMemberByLineProfile = async (memberLine: lineProfile, transaction?: Transaction, get?: boolean) => {
	const customerRegistrations = await db.customerRegistrations.findAll({
		where: {
			isDisplayed: true,
		},
		include: {
			association: db.customerRegistrations.associations.campaignChoices,
		},
		order: [['showOrder', 'asc']],
	});
	const attributes = customerRegistrations.map((item) => {
		return `customerRegistrationId${item?.customerRegistrationId}`;
	});
	const member = await db.members.findOne({
		where: { lineId: memberLine.userId },
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
			'activeUntil',
			'currentPoints',
			...attributes,
		],
		transaction,
	});
	if (member == null) {
		const member = await db.members.create(
			{
				lineId: memberLine.userId,
				displayName: memberLine.displayName,
				picUrl: memberLine.pictureUrl,
				curRM: 'defaultRM',
				via: 'others',
				origin: 'new',
			},
			{ transaction },
		);
		SocketServerService.emitMemberCreated(member);
		return member;
	} else {
		if (get) {
			return member;
		}
		return member.update(
			{
				displayName: memberLine.displayName,
				picUrl: memberLine.pictureUrl,
			},
			{ transaction },
		);
	}
};
export const findMemberByCode = async (memberCode: string, transaction?: Transaction) =>
	db.members.findOne({
		where: { memberCode: memberCode },
		transaction,
	});

export const findMemberByLineId = async (lineId: string, transaction?: Transaction) =>
	db.members.findOne({
		where: { lineId: lineId },
		transaction,
	});

export const findMemberById = async (memberId: number, transaction?: Transaction) =>
	db.sequelize.query('SELECT * FROM members WHERE memberId = :memberId LIMIT 1', {
		replacements: { memberId },
		type: QueryTypes.SELECT,
		plain: true,
		transaction,
	}) as any;
// db.members.findByPk(memberId, {
// 	attributes: { exclude: ['lineId'] },
// 	include: [
// 		{
// 			association: db.members.associations.registrations,
// 			attributes: {
// 				exclude: ['isRegistered', 'isFriends', 'isManual', 'isNotified1', 'isNotified2']
// 			},
// 			include: [{ association: db.registrations.associations.Occurrence }]
// 		},
// 		{
// 			separate: true,
// 			association: db.members.associations.campaignAnswers,
// 			attributes: ['campaignQuestionId', 'contents']
// 		}
// 	],
// 	transaction
// })

export const countOtherMemberByEmail = async (memberId: number, email: string, transaction?: Transaction) =>
	db.members.count({
		where: { memberId: { [Op.ne]: memberId }, email: email, memberCode: { [Op.not]: null } },
		transaction,
	});

export const browseMembersHandler = async (
	filters: WhereAttributeHash<Member> &
		Partial<{
			createdAtMax: Date;
			createdAtMin: Date;
			friendAddedDateMax: Date;
			friendAddedDateMin: Date;
			displayName: string;
			isFriends: 'true' | 'false';
			isRegistered: 'true' | 'false';
			notes: string;
			lastVisitMax: Date;
			lastVisitMin: Date;
			memberSinceMax: Date;
			memberSinceMin: Date;
			currentPointsMin: Date;
			currentPointsMax: Date;
			messages: 'read' | 'unread';
			memberId: string;
		}>,
	pagination?: { pp: number; p: number; sort: 'asc' | 'desc'; sortKey: string },
	isAudiencesSearch?: boolean,
): Promise<{ members: Member[]; count?: number }> => {
	const {
		notes,
		createdAtMax,
		createdAtMin,
		displayName,
		isFriends,
		isRegistered,
		lastVisitMin,
		lastVisitMax,
		memberSinceMax,
		memberSinceMin,
		currentPointsMin,
		currentPointsMax,
		messages,
		memberCode,
		friendAddedDateMin,
		friendAddedDateMax,
		memberId,
		...queries
	} = filters;
	const customerRegistrationFilter: WhereAttributeHash<CustomerRegistration> = {
		isAdminDisplayed: true,
	};
	let customerRegistrations = await db.customerRegistrations.findAll({
		where: customerRegistrationFilter,
		order: [['showOrder', 'asc']],
		include: {
			association: db.customerRegistrations.associations.campaignChoices,
			attributes: ['campaignChoiceId', 'type'],
		},
		attributes: ['customerRegistrationId', 'type'],
	});

	customerRegistrations = customerRegistrations.map((customerRegistration) => customerRegistration.toJSON());

	const customerRegistrationsQueries = customerRegistrations.reduce((prev, currentValue) => {
		const { customerRegistrationId, type, campaignChoices } = currentValue as any;
		let condition;
		const key = `customerRegistrationId${customerRegistrationId}`;
		const value = get(queries, key);

		if (type !== CUSTOMER_REGISTRATION_FIELD_TYPE.DATE_PICKER && (!value || isEmpty(value))) {
			return prev;
		}

		switch (type) {
			case CUSTOMER_REGISTRATION_FIELD_TYPE.TEXT:
			case CUSTOMER_REGISTRATION_FIELD_TYPE.NUMBER:
				condition = { [Op.like]: `%${value}%` };
				break;

			case CUSTOMER_REGISTRATION_FIELD_TYPE.CHECKBOX:
			case CUSTOMER_REGISTRATION_FIELD_TYPE.RADIO:
				condition = {
					[Op.or]: (value as string[]).map((val) => {
						if (val === CONTENT_TYPE_SURVEY_OTHER) {
							const campaignChoice = campaignChoices.find((it: any) => it.type === 'other');
							return literal(`JSON_CONTAINS(\`${key}\`, '{"checked": ${campaignChoice?.campaignChoiceId}}', '$')`);
						}
						return literal(`JSON_CONTAINS(\`${key}\`, '{"value": "${val}"}', '$')`);
					}),
				};
				break;

			case CUSTOMER_REGISTRATION_FIELD_TYPE.IMAGE:
				if (value === 'true') condition = { [Op.not]: null };
				if (value === 'false') condition = { [Op.is]: null };
				break;

			case CUSTOMER_REGISTRATION_FIELD_TYPE.DATE_PICKER: {
				const min = get(queries, `${key}Min`);
				const max = get(queries, `${key}Max`);

				if (min || max) {
					condition = {
						...(min ? { [Op.gte]: min } : {}),
						...(max ? { [Op.lte]: max } : {}),
					};
				}

				break;
			}

			default:
				break;
		}

		return {
			...prev,
			...(condition ? { [key]: condition } : {}),
		};
	}, {});

	const conditions: FindOptions<Member> = {
		...(pagination?.pp ? { limit: pagination.pp } : {}),
		...(pagination?.p ? { offset: (pagination.p - 1) * pagination.pp } : {}),
		order: [
			[literal(`${pagination?.sortKey || 'memberId'} IS NULL`), SORT.ASCENDING],
			[pagination?.sortKey || 'memberId', pagination?.sort || 'desc'],
		],
		attributes: {
			exclude: ['updatedAt'],
			include: [
				...customerRegistrations.map(({ customerRegistrationId }) => `customerRegistrationId${customerRegistrationId}`),
			],
		},
		where: {
			[Op.and]: [{ lineId: { [Op.not]: null } }],
			...(memberCode ? { memberCode } : {}),
			...(memberId ? { memberId: parseInt(memberId) } : {}),
			...generateWhereClauseBetween('createdAt', [createdAtMin, createdAtMax]),
			...generateWhereClauseBetween('friendAddedDate', [friendAddedDateMin, friendAddedDateMax]),
			...generateWhereClauseBetween('memberSince', [memberSinceMin, memberSinceMax]),
			...generateWhereClauseBetween('lastVisit', [lastVisitMin, lastVisitMax]),
			...generateWhereClauseBetween('currentPoints', [currentPointsMin, currentPointsMax]),
			...(displayName ? { displayName: { [Op.like]: `%${displayName}%` } } : {}),
			...(notes ? { notes: { [Op.like]: `%${notes}%` } } : {}),
			...(isFriends ? { isFriends: JSON.parse(isFriends) } : {}),
			...(isRegistered ? { isRegistered: JSON.parse(isRegistered) } : {}),
			// ...(lastVisitMax ? { lastVisit: { [Op.lte]: lastVisitMax } } : {}),
			// ...(lastVisitMin ? { lastVisit: { [Op.gte]: lastVisitMin } } : {}),
			...(messages ? { unreadCount: { [messages === 'read' ? Op.eq : Op.gt]: 0 } } : {}),
			...customerRegistrationsQueries,
		},
	};

	const members = await db.members.findAll(conditions);

	if (!pagination) {
		return { members };
	}

	const count = await db.members.count(conditions);

	return { members, count };
};

export const listMembers = async (memberWhere?: WhereAttributeHash, transaction?: Transaction) =>
	db.members.findAll({
		where: memberWhere,
		attributes: { exclude: ['lineId'] },
		transaction,
	});

export const createMember = async (params: CreationAttributes<Member>, transaction?: Transaction) =>
	db.members.create(params, { transaction });

export async function updateMember(
	{ memberId, params, filesRequest }: { memberId: number; params: UpdateMember; filesRequest: any },
	transaction?: Transaction,
) {
	const member = await db.members.findByPk(memberId);
	if (!member) {
		throw new AppError(SYSTEM_ERROR, 'invalid member', false);
	}
	if (!_.isNil(params.activeUntil) && moment(params.activeUntil).isValid()) {
		member.set({ activeUntil: params.activeUntil });
	}
	if (!_.isNil(params.pointIsAdd) && _.isNumber(params.points)) {
		const newPoints = member.addOrDeductPoint(params.points, params.pointIsAdd);
		if (newPoints < 0) {
			throw new AppError(SYSTEM_ERROR, 'total point amount cannot be negative');
		}
		member.set({ currentPoints: newPoints });
	}
	if (!_.isNil(params.notes)) {
		member.set({ notes: params.notes });
	}

	if (CommonUtils.isTrue(params?.isEditMember)) {
		const customerRegistrations = await db.customerRegistrations.findAll({
			where: {
				isAdminDisplayed: true,
			},
			include: {
				association: db.customerRegistrations.associations.campaignChoices,
				attributes: { exclude: ['customerRegistrationId', 'campaignQuestionId'] },
			},
			order: [['showOrder', 'asc']],
		});
		const dataMember: any = {};
		const arrayIsDelete: number[] = [];

		customerRegistrations.forEach((item) => {
			const column = `customerRegistrationId${item?.customerRegistrationId}`;
			const data = _.get(params, column);

			if (item?.required) {
				if (!data) {
					throw new AppError(BAD_REQUEST, `${item.label} not null`, false);
				}
				if (item.isDelete) {
					arrayIsDelete.push(item.customerRegistrationId);
				}
			} else if (data && item.isDelete) {
				arrayIsDelete.push(item.customerRegistrationId);
			}

			const setData = (data: any) => {
				_.set(dataMember, column, data);
			};

			switch (item.type) {
				case CUSTOMER_REGISTRATION_FIELD_TYPE.ADDRESS:
					setData(data);
					break;

				case CUSTOMER_REGISTRATION_FIELD_TYPE.TEXT:
					setData(data?.trim() || null);
					break;
				case CUSTOMER_REGISTRATION_FIELD_TYPE.NUMBER:
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
				case CUSTOMER_REGISTRATION_FIELD_TYPE.DATE_PICKER:
					if (data) {
						const isValid = !isNaN(new Date(data).getTime());
						if (!isValid) {
							throw new AppError(BAD_REQUEST, 'validate datepicker', false);
						}
					}

					setData(data || null);
					break;
				case CUSTOMER_REGISTRATION_FIELD_TYPE.CHECKBOX: {
					if (data && data !== 'undefined') {
						const dataParsed = JSON.parse(data);
						const dataMap = _.keyBy(dataParsed, 'checked');

						const selectCheckbox = item.campaignChoices?.filter((item) => dataMap[item.campaignChoiceId]);

						if (item?.required && !selectCheckbox?.length) {
							throw new AppError(BAD_REQUEST, 'validate checkbox', false);
						}

						const campaignChoiceContents = (selectCheckbox || [])
							.map((r) => r.toJSON())
							.map(({ campaignChoiceId, contents, type }) => ({
								checked: campaignChoiceId,
								value: type === CAMPAIGN_CHOICES_TYPE_OTHER ? _.get(dataMap, campaignChoiceId).value : contents,
							}));

						setData(campaignChoiceContents.length ? JSON.stringify(campaignChoiceContents) : null);
					}
					break;
				}
				case CUSTOMER_REGISTRATION_FIELD_TYPE.RADIO: {
					if (data && data !== 'undefined') {
						const dataParsed = JSON.parse(data);
						const campaignChoiceId = _.get(dataParsed, 'checked');

						const selectRadio: any = item.campaignChoices?.find(
							(item) => item.campaignChoiceId === Number(campaignChoiceId),
						);

						if (item?.required && !selectRadio) {
							throw new AppError(BAD_REQUEST, 'validate radio', false);
						}

						setData(
							JSON.stringify({
								checked: campaignChoiceId,
								value:
									selectRadio?.type === CAMPAIGN_CHOICES_TYPE_OTHER
										? _.get(dataParsed, 'value')
										: _.get(selectRadio, 'contents'),
							}),
						);
					}
					break;
				}
				case CUSTOMER_REGISTRATION_FIELD_TYPE.IMAGE:
					if (item?.required) {
						if (!Array.isArray(filesRequest)) {
							throw new AppError(BAD_REQUEST, 'validate date', false);
						}
						const name = data;
						const files = filesRequest.find((item) => item?.originalname === name);

						if (!files || !name) {
							throw new AppError(BAD_REQUEST, 'validate date', false);
						}

						setData(files.filename);
					} else {
						let files: any;
						if (Array.isArray(filesRequest)) {
							const name = data;
							if (name) {
								files = filesRequest.find((item) => item?.originalname === name);
							}
						}
						setData(files ? files.filename : null);
					}
					break;
				default:
					throw new AppError(SYSTEM_ERROR, 'data error', false);
			}
		});

		if (!_.isEmpty(dataMember)) {
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
		}
	}

	member.set(
		_.pickBy(_.pick(params, ['firstName', 'lastName', 'companyName', 'telephone', 'address']), (value) =>
			_.isUndefined(value),
		),
	);
	await member.save({ transaction });
	return member;
}

export const deleteMember = async (memberId: number, transaction?: Transaction) => {
	const imageFilesToDelete: string[] = [];
	let registrationIds: number[] = [];
	return db.members
		.findByPk(memberId, {
			include: [
				{
					association: db.members.associations.chats,
				},
				{
					association: db.members.associations.registrations,
					required: false,
					paranoid: false,
				},
			],
			transaction,
		})
		.then((member) => {
			if (member == null) {
				throw new AppError(SYSTEM_ERROR, `member ${memberId} not exist`, false);
			}
			return member;
		})
		.then(async (member) => {
			if (member.registrations && member.registrations.length > 0) {
				registrationIds = member.registrations.map((r) => r.registrationId);
				await removeRegistrationPersonalInfos({ registrationIds }, transaction);
			}
			if (member.curRM == 'memberRM' && member.lineId) {
				await unlinkRichMenuFromUser({ userId: member.lineId });
			}
			return member;
		})
		.then((member) => Promise.all([member.destroy({ transaction }), removeMemberAndKidsFiles(imageFilesToDelete)]));
};

const removeRegistrationPersonalInfos = async (
	{ registrationIds }: { registrationIds: number[] },
	transaction?: Transaction,
) =>
	db.registrations.update(
		{ memberId: null },
		{
			where: { registrationId: { [Op.in]: registrationIds } },
			paranoid: false,
			transaction,
		},
	);

const removeMemberAndKidsFiles = async (imageFileNames: string[]) =>
	Promise.all(
		imageFileNames.map((imageFileName) =>
			FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_MEMBER, imageFileName)),
		),
	);

export const setRichmenuOfMember = async (
	{ member, type }: { member: Member; type: richmenuType },
	transaction?: Transaction,
) => {
	const memberRM = await db.richmenus.findOne({ where: { type: type, isDisplayed: true }, transaction });
	if (memberRM != null && memberRM.isDisplayed == true && memberRM.richMenuId) {
		await linkRichMenuToUser({ userId: member.lineId as string, richmenuId: memberRM.richMenuId });
	}
};

export const getMemberCsvData = async (
	memberWhere: Parameters<typeof browseMembersHandler>[0],
	pagination?: paginationParams,
): Promise<ReturnType<typeof json2csv.parse>> => {
	const customerRegistrations = await db.customerRegistrations.findAll({
		where: [
			{
				isAdminDisplayed: true,
			},
		],
		attributes: ['customerRegistrationId', 'type', 'label'],
		include: [{ association: db.customerRegistrations.associations.campaignChoices }],
		order: [['showOrder', 'asc']],
	});

	const { members } = await browseMembersHandler(memberWhere, pagination);

	const csvData = members
		.map((member) => member.toJSON())
		.map((member) => {
			const friendAddedDate = member.friendAddedDate || member.createdAt;
			return transformUserCsvData(member as Member, customerRegistrations, {
				会員ID: `${member.memberId ?? ''}`,
				会員コード: member.memberCode ?? '',
				LINE名: member.displayName ?? '',
				LINEフォロー状態: `${member.isFriends ? MEMBER_IS_FRIEND_LABEL.IS_FRIEND : MEMBER_IS_FRIEND_LABEL.NOT_FRIEND}`,
				備考欄: get(member, 'notes', '') as string,
				来店回数: `${get(member, 'countVisit', 'ー')}回`,
				最終来店日: formatDate(member?.lastVisit),
				ポイント: get(member, 'currentPoints', '0') as string,
				友だち登録日: formatDate(friendAddedDate),
				会員登録日: formatDate(member?.memberSince),
				有効期限: formatDate(member?.activeUntil),
			});
		});

	const fields = [
		'会員ID',
		'会員コード',
		'LINE名',
		'LINEフォロー状態',
		...map(customerRegistrations, (cR) => cR?.label),
		'備考欄',
		'来店回数',
		'最終来店日',
		'ポイント',
		'友だち登録日',
		'会員登録日',
		'有効期限',
	];

	const opts = { fields: fields, withBOM: true, excelStrings: true };

	const csv = json2csv.parse(csvData, opts);

	return csv;
};

export const browseSurveyAnswerHistoriesHandler = async (queries: {
	memberId: number;
	pagination: paginationParams;
}): Promise<{
	count: number;
	rows: MemberSurveyReward[];
}> => {
	const { memberId, pagination } = queries;

	const sharedFindOptions: FindOptions<MemberSurveyReward> = {
		where: {
			memberId,
		},
		...buildPaginationParams(pagination),
	};

	const rows = await db.memberSurveyRewardModel.findAll({
		// raw: true,
		include: [
			{
				model: db.surveys,
				attributes: [],
			},
		],
		attributes: [
			//
			['memberSurveyRewardId', 'id'],
			'surveyId',
			'surveyRewardCode',
			[Sequelize.literal('Survey.svname'), 'surveyName'],
		],
		...sharedFindOptions,
	});

	const count = await db.memberSurveyRewardModel.count({
		...sharedFindOptions,
	});

	return {
		count,
		rows,
	};
};

export const browseLotteryDrawHistoriesHandler = async (queries: {
	memberId: number;
	pagination: paginationParams;
}): Promise<{
	count: number;
	rows: DrawModel[];
}> => {
	const { memberId, pagination } = queries;

	const sharedFindOptions: FindOptions<DrawModel> = {
		where: {
			customerId: memberId,
		},
		include: [
			{
				model: db.lotteries,
				attributes: [],
			},
			{
				model: db.lotteryPrizes,
				attributes: [],
				include: [
					{
						model: db.coupons,
					},
				],
			},
		],
		...buildPaginationParams(pagination),
	};

	const rows = await db.draws.findAll({
		...sharedFindOptions,
		attributes: [
			//
			'drawId',
			[Sequelize.col('`Lottery`.`title`'), 'lotteryName'],
			[Sequelize.col('`LotteryPrize`.`name`'), 'prizeName'],
			[Sequelize.col('`LotteryPrize->Coupon`.`title`'), 'couponName'],
		],
	});

	const count = await db.draws.count(sharedFindOptions);

	return { rows, count };
};

export const updateCustomerRegistrationByMemberById = async (
	memberId: number,
	dataUpdate: Record<string, string>,
	transaction: Transaction | undefined,
) => {
	let updateQuery = 'UPDATE members SET';
	Object.keys(dataUpdate)?.forEach((item, index) => {
		if (Object.keys(dataUpdate)?.length === index + 1) {
			updateQuery += ` ${item} = :${item}`;
			return;
		}
		updateQuery += ` ${item} = :${item},`;
	});
	updateQuery += ' WHERE memberId = :memberId';

	return db.sequelize.query(updateQuery, {
		replacements: { ...dataUpdate, memberId },
		type: QueryTypes.UPDATE,
		transaction,
	});
};
