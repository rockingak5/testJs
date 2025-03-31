import {
	AudienceGroupStatus,
	AudienceGroups,
	Client,
	FlexContainer,
	FlexMessage,
	ImageMessage,
	Message,
	RichMenu,
	TemplateContent,
	TemplateMessage,
	TextMessage,
	FlexText,
} from '@line/bot-sdk';
import axios, { AxiosResponse } from 'axios';
import { Attributes, HasMany, HasOne, Op, QueryTypes, Sequelize, WhereAttributeHash } from 'sequelize';
import {
	AUDIENCE_TYPE,
	AUDIENCE_STATUS,
	BAD_REQUEST,
	CONFLICT_ERROR,
	lineConfig,
	AUDIENCE_PARTICIPATION_STATUS,
	TIME_ZONE_DEFAULT,
	WATCH_MESSAGE_KEY_REGISTRATION,
	EVENT_REGISTRATIONS_REPLACER_MESSAGE,
} from '../config';
import { db } from '../models';
import { Audience } from '../models/audienceModel';
import { CampaignQuestion } from '../models/campaignQuestionModel';
import { Member } from '../models/memberModel';
import { AppError, writeLog } from '../utilities';
import { emitAudience } from './socketioService';
import moment from 'moment';
import { set, merge, pick } from 'lodash';
import { z } from 'zod';
import { SettingService, SpectatorService } from '.';

const lineBotClient = new Client({
	channelSecret: lineConfig.LINE_CHANNEL_SECRET,
	channelAccessToken: lineConfig.LINE_CHANNEL_ACCESS_TOKEN,
});

const {
	replacerName,
	replacerDateTime,
	replacerTelephone,
	replacerTelephoneCompany,
	replacerConfirmationUrl,
	replacerBuilding,
} = EVENT_REGISTRATIONS_REPLACER_MESSAGE;

export const verifyAccessToken = async (token: string) => {
	try {
		const oauth2 = await axios(`https://api.line.me/oauth2/v2.1/verify?access_token=${token}`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
			},
		}).then((r) => r.data);
		if (oauth2.error) throw new Error(`oauth axios err ${oauth2.error_description}`);
		if (oauth2.client_id != lineConfig.LINE_LOGIN_CHANNEL_ID)
			throw new Error(`client_id mismatch ${oauth2.client_id} != ${lineConfig.LINE_LOGIN_CHANNEL_ID}`);
		if (oauth2.expires_in <= 0) throw new Error(`expired ${oauth2.expires_in} < 0`);
		return true;
	} catch (e) {
		return false;
	}
};

export const getProfileByToken = async (token: string): Promise<lineProfile | null> => {
	try {
		const profile = await axios('https://api.line.me/v2/profile', {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json',
			},
		}).then((r) => r.data);

		return profile;
	} catch (e) {
		return null;
	}
};

export const checkIfFriends = async (lineId: string) =>
	lineBotClient
		.getProfile(lineId)
		.then((profile) => (profile ? true : false))
		.catch(() => false);

export const getProfile = async (lineId: string) => lineBotClient.getProfile(lineId).catch(() => null);

export const sendReminders = async (registrations: { lineId: string; message: string }[]) =>
	await Promise.all(
		registrations.map(async (r) => {
			await sendTextMessage(r.lineId, r.message).catch((err) =>
				writeLog(`failed to send message on sendReminders ${r.lineId}, ${r.message.length}. ${err.message}`, 'crit'),
			);
		}),
	);

export const replyMessage = async (
	replyToken: string,
	messages: Message | Message[],
	isNotificationDisabled = false,
) => {
	try {
		return await lineBotClient.replyMessage(replyToken, messages, isNotificationDisabled);
	} catch (error: any) {
		writeLog(`🚀 ~ file: lineService.ts:91 ~ replyMessage ~ error: ${error?.message}`, 'info');
	}
};

export const sendMessage = async (...args: Parameters<typeof lineBotClient.pushMessage>) => {
	try {
		return await lineBotClient.pushMessage(...args);
	} catch (error: any) {
		writeLog(`🚀 ~ file: lineService.ts:99 ~ sendMessage ~ error: ${error?.message}`, 'info');
	}
};

export const sendTextMessage = async (lineId: string, message: string) => {
	try {
		return await lineBotClient.pushMessage(lineId, CreateTextMessage(message));
	} catch (error: any) {
		writeLog(`🚀 ~ file: lineService.ts:107 ~ sendTextMessage ~ error: ${error?.message}`, 'info');
	}
};

export const sendFlexMessage = async (lineId: string, message: FlexContainer, altText = 'event') => {
	try {
		return await lineBotClient.pushMessage(lineId, CreateFlexMessage(message, altText));
	} catch (error: any) {
		writeLog(`🚀 ~ file: lineService.ts:115 ~ sendFlexMessage ~ error: ${error?.message}`, 'info');
	}
};

export const sendImageMessage = async (lineId: string, url: string) => {
	try {
		return await lineBotClient.pushMessage(lineId, CreateImageMessage(url));
	} catch (error: any) {
		writeLog(`file: lineService.ts:123 ~ sendImageMessage ~ error: ${error?.message}`, 'info');
	}
};

export const sendTemplateMessage = async (lineId: string, altText: string, template: TemplateContent) => {
	try {
		return await lineBotClient.pushMessage(lineId, CreateTemplateMessage(altText, template));
	} catch (error: any) {
		writeLog(`🚀 ~ file: lineService.ts:131 ~ sendTemplateMessage ~ error: ${error?.message}`, 'info');
	}
};

export const sendMulticastMessage = async (lineIds: string[], message: string) => {
	try {
		lineIds.length == 1
			? await lineBotClient.pushMessage(lineIds[0], CreateTextMessage(message))
			: await lineBotClient.multicast(lineIds, CreateTextMessage(message));
	} catch (err: any) {
		writeLog('🚀 ~ file: lineService.ts:141 ~ sendMulticastMessage ~ err:' + err?.message, 'info');
	}
};

export const CreateFlexText = (t: string, wrap = true, align: 'start' | 'center' | 'end' = 'start'): FlexMessage => {
	return {
		type: 'flex',
		altText: t,
		contents: {
			type: 'bubble',
			direction: 'ltr',
			body: {
				type: 'box',
				layout: 'vertical',
				contents: [{ type: 'text', text: t, align: align, wrap: wrap }],
			},
		},
	};
};
const CreateTextMessage = (t: string): TextMessage => {
	return {
		type: 'text',
		text: t,
	};
};
const CreateFlexMessage = (content: FlexContainer, altText = 'event'): FlexMessage => {
	return {
		type: 'flex',
		altText,
		contents: content,
	};
};
const CreateImageMessage = (url: string): ImageMessage => {
	return {
		type: 'image',
		originalContentUrl: url,
		previewImageUrl: url,
	};
};

const CreateTemplateMessage = (altText: string, template: TemplateContent): TemplateMessage => {
	return {
		type: 'template',
		altText: altText,
		template: template,
	};
};
//Richmenu
export const linkRichMenuToUser = async ({ userId, richmenuId }: { userId: string; richmenuId: string }) => {
	try {
		await lineBotClient.linkRichMenuToUser(userId, richmenuId);
	} catch (err: any) {
		writeLog(
			`lineService.linkRichMenuToUser failed userId: ${userId} richMenuId: ${richmenuId} error: ${err.message}`,
			'info',
		);
		throw new AppError(BAD_REQUEST, 'lineService.linkRichMenuToUser failed', false);
	}
};

export const linkRichMenuToMultipleUsers = async ({
	userIds,
	richMenuId,
}: {
	userIds: string[];
	richMenuId: string;
}) => {
	try {
		await lineBotClient.linkRichMenuToMultipleUsers(richMenuId, userIds);
	} catch (err: any) {
		writeLog(
			`lineService.linkRichMenuToMultipleUsers failed userIds: ${userIds} richMenuId: ${richMenuId} error: ${err.message}`,
			'info',
		);
		throw new AppError(BAD_REQUEST, 'lineService.linkRichMenuToMultipleUsers failed', false);
	}
};

export const unlinkRichMenuFromUser = async ({ userId }: { userId: string }) => {
	try {
		await lineBotClient.unlinkRichMenuFromUser(userId);
	} catch (err: any) {
		writeLog(`lineService.unlinkRichMenuFromUser failed userId: ${userId} error: ${err.message}`, 'info');
		throw new AppError(BAD_REQUEST, 'lineService.unlinkRichMenuFromUser failed', false);
	}
};

export const unlinkRichMenusFromMultipleUsers = async ({ userIds }: { userIds: string[] }) => {
	try {
		await lineBotClient.unlinkRichMenusFromMultipleUsers(userIds);
	} catch (err: any) {
		writeLog(`lineService.unlinkRichMenusFromMultipleUsers failed userIds: ${userIds} error: ${err.message}`, 'info');
		throw new AppError(BAD_REQUEST, 'lineService.unlinkRichMenusFromMultipleUsers failed', false);
	}
};

export const setDefaultRichMenu = async ({ richMenuId }: { richMenuId: string }) => {
	try {
		await lineBotClient.setDefaultRichMenu(richMenuId);
	} catch (err: any) {
		writeLog(`lineService.setDefaultRichMenu failed richmenuId: ${richMenuId} error: ${err.message}`, 'info');
		throw new AppError(BAD_REQUEST, 'lineService.setDefaultRichMenu failed', false);
	}
};

export const deleteDefaultRichMenu = async () => {
	try {
		await lineBotClient.deleteDefaultRichMenu();
	} catch (err: any) {
		writeLog(`lineService.deleteDefaultRichMenu failed  error: ${err.message}`, 'info');
		throw new AppError(BAD_REQUEST, 'lineService.deleteDefaultRichMenu failed', false);
	}
};

export const setRichMenuImage = async ({ richmenuId, data }: { richmenuId: string; data: Buffer }) => {
	try {
		await lineBotClient.setRichMenuImage(richmenuId, data);
	} catch (err: any) {
		writeLog(`lineService.setRichMenuImage failed richmenuId: ${richmenuId} error: ${err.message}`, 'info');
		throw new AppError(BAD_REQUEST, 'lineService.setRichMenuImage failed', false);
	}
};

export const createRichMenu = async ({ richmenu }: { richmenu: RichMenu }) => {
	try {
		await lineBotClient.createRichMenu(richmenu);
	} catch (err: any) {
		writeLog(`lineService.createRichMenu failed error: ${err.message}`, 'info');
		throw new AppError(BAD_REQUEST, 'lineService.createRichMenu failed', false);
	}
};

export const deleteRichMenu = async ({ richmenuId }: { richmenuId: string }) => {
	try {
		await lineBotClient.deleteRichMenu(richmenuId);
	} catch (err: any) {
		writeLog(`lineService.deleteRichMenu failed richmenuId: ${richmenuId} error: ${err.message}`, 'info');
		throw new AppError(BAD_REQUEST, 'lineService.deleteRichMenu failed', false);
	}
};

///Audience
export const listAudiences = async (type: 'default' | 'campaign' | 'survey' | 'lottery') => {
	const isSurvey = type === 'survey';

	const audiencesDB = await db.audiences.findAll({
		where: { type },
		attributes: ['audienceGroupId', 'remarks', 'searchCondition'],
		...(isSurvey
			? {
					include: [
						{
							model: db.surveyTemplate,
							association: new HasMany(db.audiences, db.surveyTemplate, {
								foreignKey: 'surveyId',
								as: 'templates',
							}),
							on: Sequelize.literal('`templates`.`surveyId` = `Audience`.`searchCondition` -> "$.surveyId"'),
							attributes: [['tpId', 'id'], 'type', 'label', 'options'],
						},
						{
							model: db.surveys,
							association: new HasOne(db.audiences, db.surveys, {
								foreignKey: 'surveyId',
								as: 'survey',
							}),
							on: Sequelize.literal('`survey`.`surveyId` = `Audience`.`searchCondition` -> "$.surveyId"'),
							attributes: [['svname', 'name']],
						},
					],
			  }
			: {}),
		order: [
			['createdAt', 'DESC'],
			...(isSurvey ? ([[Sequelize.literal('`templates`.`showOrder`'), 'ASC']] as any[]) : []),
		],
	});
	const audiencesAPI = await getAudiencesFromAPI(1);

	const result: (Attributes<Audience> & { status: AudienceGroupStatus; created: number })[] = [];
	audiencesDB.forEach((aDB) => {
		const aAPI = audiencesAPI.find((aud) => aud.audienceGroupId == aDB.audienceGroupId);
		if (aAPI != undefined) {
			result.push({
				audienceGroupId: aAPI.audienceGroupId,
				description: aAPI.description,
				status: aAPI.status,
				audienceCount: aAPI.audienceCount,
				created: aAPI.created,
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				//@ts-ignore
				expireTimestamp: aAPI.expireTimestamp,
				searchCondition: aDB.searchCondition,
				remarks: aDB.remarks,
				...(isSurvey
					? {
							templates: (aDB as any).templates,
							survey: (aDB as any).survey,
					  }
					: {}),
			});
		}
	});
	return result;
};

export const searchAudience = async (searchParams: audienceSearchType) => {
	const resultCount = await findMembersForAudience(searchParams);
	return { count: resultCount.length };
};

export const searchCampaignAudience = async (searchParams: audienceCampaignSearchType) => {
	const resultCount = await findCampaignMembersForAudience(searchParams);

	return { count: resultCount.length };
};

export const deleteAudience = async (audienceGroupId: string) => {
	await lineBotClient.deleteAudienceGroup(audienceGroupId);
	await db.audiences.destroy({ where: { audienceGroupId: audienceGroupId } });
	return;
};

export const createAudience = async (createParams: audienceCreateType) => {
	const audienceName = createParams.audienceName;
	if (!audienceName) {
		throw new Error('audience name not provided');
	}
	if (await db.audiences.findOne({ raw: true, where: { description: audienceName, type: AUDIENCE_TYPE.DEFAULT } })) {
		throw new AppError(CONFLICT_ERROR, 'オーディエンス名が重複しています');
	}
	const lineIds = await findMembersForAudience(createParams);
	if (lineIds.length == 0) {
		throw new Error('lineId not provided');
	}
	const members = lineIds.map((a) => ({ id: a.lineId as string }));
	const audienceAPI = await lineBotClient.createUploadAudienceGroup({
		description: createParams.audienceName,
		audiences: members,
	});

	const questionWhere: WhereAttributeHash = {};
	if (createParams.questions && createParams.questions.length > 0) {
		questionWhere.campaignQuestionId = {
			[Op.in]: createParams.questions.map((q: questionArgumentType) => q.questionId),
		};
	}
	const questions = await db.campaignQuestions.findAll({
		where: questionWhere,
		attributes: ['campaignQuestionId', 'contents', 'showOrder'],
	});
	const audienceRemarks = generateAudienceRemarks(questions, createParams);

	await db.audiences.create({
		audienceGroupId: audienceAPI.audienceGroupId,
		description: createParams.audienceName,
		audienceCount: members.length,
		searchCondition: createParams,
		remarks: audienceRemarks,
	});

	emitAudience({ audienceGroupId: audienceAPI.audienceGroupId });

	return members;
};

export const createCampaignAudience = async (createParams: audienceCampaignCreateType) => {
	const audienceName = createParams.audienceName;
	if (!audienceName) {
		throw new Error('audience name not provided');
	}
	if (await db.audiences.findOne({ raw: true, where: { description: audienceName, type: AUDIENCE_TYPE.CAMPAIGN } })) {
		throw new AppError(CONFLICT_ERROR, 'オーディエンス名が重複しています');
	}
	const lineIds = await findCampaignMembersForAudience(createParams);
	if (lineIds.length == 0) {
		throw new Error('lineId not provided');
	}
	const members = lineIds.map((a: any) => ({ id: a?.lineId as string }));
	const audienceAPI = await lineBotClient.createUploadAudienceGroup({
		description: createParams.audienceName,
		audiences: members,
	});

	await db.audiences.create({
		audienceGroupId: audienceAPI.audienceGroupId,
		description: createParams.audienceName,
		audienceCount: members.length,
		searchCondition: createParams,
		type: AUDIENCE_TYPE.CAMPAIGN,
	});

	emitAudience({ audienceGroupId: audienceAPI.audienceGroupId });

	return members;
};

type TCreateSurveyAudience = {
	name: string;
	members: { id: string }[];
	searchCondition: Record<string, string>;
};
export const createSurveyAudience = async (data: TCreateSurveyAudience) => {
	if (await db.audiences.findOne({ raw: true, where: { description: data.name, type: AUDIENCE_TYPE.SURVEY } })) {
		throw new AppError(BAD_REQUEST, 'オーディエンス名が重複しています');
	}

	const audienceAPI = await lineBotClient.createUploadAudienceGroup({
		description: data.name,
		audiences: data.members,
	});

	await db.audiences.create({
		audienceGroupId: audienceAPI.audienceGroupId,
		description: data.name,
		audienceCount: data.members.length,
		searchCondition: data.searchCondition,
		type: AUDIENCE_TYPE.SURVEY,
	});

	emitAudience({ audienceGroupId: audienceAPI.audienceGroupId });

	return data.members;
};

export const createLotteryAudience = async (data: TCreateSurveyAudience) => {
	if (await db.audiences.findOne({ raw: true, where: { description: data.name, type: AUDIENCE_TYPE.LOTTERY } })) {
		throw new AppError(CONFLICT_ERROR, 'オーディエンス名が重複しています');
	}

	const audienceAPI = await lineBotClient.createUploadAudienceGroup({
		description: data.name,
		audiences: data.members,
	});

	await db.audiences.create({
		audienceGroupId: audienceAPI.audienceGroupId,
		description: data.name,
		audienceCount: data.members.length,
		searchCondition: data.searchCondition,
		type: AUDIENCE_TYPE.LOTTERY,
	});

	emitAudience({ audienceGroupId: audienceAPI.audienceGroupId });

	return data.members;
};

const getAudiencesFromAPI = async (page = 1, description?: string): Promise<AudienceGroups> => {
	const fragment = await lineBotClient.getAudienceGroups(page, description, undefined, 40, undefined, false);
	if (fragment.hasNextPage) {
		return fragment.audienceGroups.concat(await getAudiencesFromAPI(page + 1));
	} else {
		return fragment.audienceGroups;
	}
};

const findMembersForAudience = async (searchParams: audienceSearchType) => {
	const membersWhere = [],
		questionWhere: string[] = [],
		bindParams: Record<string, string | number | boolean> = {},
		paramsMember = [
			'isCampaign',
			'address',
			'memberSinceMin',
			'memberSinceMax',
			'candidateAtMin',
			'candidateAtMax',
			'hasWon',
		];
	if ('isCampaign' in searchParams && searchParams.isCampaign != undefined) {
		membersWhere.push('Member.isCampaign = :isCampaign');
		bindParams.isCampaign = searchParams.isCampaign;
	}
	if (searchParams.candidateAtMin && searchParams.candidateAtMax) {
		membersWhere.push('Member.candidateAt BETWEEN :candidateAtMin AND :candidateAtMax');
		bindParams.candidateAtMin = moment(searchParams.candidateAtMin).format('YYYY-MM-DD HH:mm:ss');
		bindParams.candidateAtMax = moment(searchParams.candidateAtMax).format('YYYY-MM-DD HH:mm:ss');
	} else if (searchParams.candidateAtMin) {
		membersWhere.push('Member.candidateAt >= :candidateAtMin');
		bindParams.candidateAtMin = moment(searchParams.candidateAtMin).format('YYYY-MM-DD HH:mm:ss');
	} else if (searchParams.candidateAtMax) {
		membersWhere.push('Member.candidateAt <= :candidateAtMax');
		bindParams.candidateAtMax = moment(searchParams.candidateAtMax).format('YYYY-MM-DD HH:mm:ss');
	} else if (searchParams.hasWon != undefined) {
		membersWhere.push(searchParams.hasWon ? 'Member.candidateAt IS NOT NULL' : 'Member.candidateAt IS NULL');
	}
	if (searchParams.address) {
		membersWhere.push(
			'(Member.address LIKE :address OR Member.building LIKE :address OR Member.postalCode LIKE :address)',
		);
		bindParams.address = `%${searchParams.address}%`;
	}
	if (searchParams.memberSinceMin && searchParams.memberSinceMax) {
		membersWhere.push('Member.createdAt BETWEEN :memberSinceMin AND :memberSinceMax');
		bindParams.memberSinceMin = moment(searchParams.memberSinceMin).format('YYYY-MM-DD HH:mm:ss');
		bindParams.memberSinceMax = moment(searchParams.memberSinceMax).format('YYYY-MM-DD HH:mm:ss');
	} else if (searchParams.memberSinceMin) {
		membersWhere.push('Member.createdAt >= :memberSinceMin');
		bindParams.memberSinceMin = moment(searchParams.memberSinceMin).format('YYYY-MM-DD HH:mm:ss');
	} else if (searchParams.memberSinceMax) {
		membersWhere.push('Member.createdAt <= :memberSinceMax');
		bindParams.memberSinceMax = moment(searchParams.memberSinceMax).format('YYYY-MM-DD HH:mm:ss');
	}
	if (searchParams.categoryId) {
		membersWhere.push('Registration.categoryId = :categoryId');
		bindParams.categoryId = searchParams.categoryId;
	}
	if (searchParams.occasionId) {
		membersWhere.push('Registration.occasionId = :occasionId');
		bindParams.occasionId = searchParams.occasionId;
	}
	if (searchParams.participationStatus === AUDIENCE_PARTICIPATION_STATUS.CANCEL) {
		membersWhere.push('Registration.cancelledAt IS NOT NULL');
	} else if (searchParams.participationStatus === AUDIENCE_PARTICIPATION_STATUS.PARTICIPATE) {
		membersWhere.push('Registration.attended IS TRUE');
	} else if (searchParams.participationStatus === AUDIENCE_PARTICIPATION_STATUS.RESERVE) {
		membersWhere.push('Registration.cancelledAt IS NULL AND Registration.attended IS FALSE');
	}
	if (searchParams.registrationDateMin && searchParams.registrationDateMax) {
		membersWhere.push('Registration.createdAt BETWEEN :registrationDateMin AND :registrationDateMax');
		bindParams.registrationDateMin = searchParams.registrationDateMin;
		bindParams.registrationDateMax = searchParams.registrationDateMax;
	} else if (searchParams.registrationDateMin) {
		membersWhere.push('Registration.createdAt >= :registrationDateMin');
		bindParams.registrationDateMin = searchParams.registrationDateMin;
	} else if (searchParams.registrationDateMax) {
		membersWhere.push('Registration.createdAt <= :registrationDateMax');
		bindParams.registrationDateMax = searchParams.registrationDateMax;
	}
	if (searchParams.questions && searchParams.questions.length > 0) {
		searchParams.questions.map((q: audienceSearchQuestionSubtype, i: number) => {
			const content: any = q.value;
			if (content && content.length > 0) {
				questionWhere.push(
					`(CampaignAnswer.campaignQuestionId = :questionId${i} AND CampaignAnswer.contents IN (:content${i}))`,
				);
				bindParams['questionId' + i] = q.questionId;
				bindParams['content' + i] = content;
			}
		});
	}
	// convert parameter string to int
	for (const key in bindParams) {
		// eslint-disable-next-line security/detect-object-injection
		const val = bindParams[key];
		// eslint-disable-next-line security/detect-object-injection
		bindParams[key] = !isNaN(val as number) ? parseInt(val as string) : val;
	}
	// check if searchParams is empty and exist params member
	const params: any = searchParams;
	let isEmptyParam = true;
	let existParamMember = false;
	for (const key in searchParams) {
		// eslint-disable-next-line security/detect-object-injection
		const val = params[key];
		if (key == 'questions') {
			val.map((q: audienceSearchQuestionSubtype) => {
				const v: any = q.value;
				if (v.length > 0) {
					isEmptyParam = false;
				}
			});
		} else if (typeof val == 'string' && val) {
			isEmptyParam = false;
		} else if (typeof val == 'number') {
			isEmptyParam = false;
		}
		if (paramsMember.includes(key)) {
			existParamMember = true;
		}
	}
	let querySqlData = '',
		querySqlData1 = '',
		querySqlData2 = '';
	if (isEmptyParam) {
		querySqlData1 = 'SELECT lineId FROM members WHERE lineId IS NOT NULL AND isRegistered = 1';
	} else if (
		existParamMember &&
		!('categoryId' in searchParams) &&
		!('occasionId' in searchParams) &&
		membersWhere.length > 0
	) {
		querySqlData1 = `SELECT Member.lineId FROM members AS Member WHERE Member.lineId IS NOT NULL AND isRegistered = 1 AND (${membersWhere.join(
			' OR ',
		)})`;
	} else if (membersWhere.length > 0) {
		querySqlData1 = `SELECT DISTINCT Member.lineId FROM members AS Member
                            INNER JOIN registrations AS Registration ON Registration.memberId = Member.memberId AND Member.isRegistered = 1 
                            WHERE ${membersWhere.join(' OR ')}`;
	}
	querySqlData2 =
		questionWhere.length > 0
			? `SELECT DISTINCT Member.lineId FROM members AS Member
                        LEFT JOIN campaignAnswers AS CampaignAnswer ON Member.memberId = CampaignAnswer.memberId AND Member.isRegistered = 1 
                        WHERE CampaignAnswer.memberId IS NOT NULL AND (${questionWhere.join(' OR ')})`
			: '';
	if (querySqlData1 && querySqlData2) {
		querySqlData = `${querySqlData1} UNION ${querySqlData2}`;
	} else if (querySqlData1) {
		querySqlData = `${querySqlData1}`;
	} else if (querySqlData2) {
		querySqlData = `${querySqlData2}`;
	} else {
		querySqlData = 'SELECT DISTINCT members.lineId FROM members WHERE lineId IS NOT NULL AND isFriends = TRUE';
	}

	const membersData: Attributes<Member>[] = await db.sequelize.query(`${querySqlData}`, {
		replacements: bindParams,
		type: QueryTypes.SELECT,
	});

	const memberLineIds = membersData.filter((m) => m.lineId != null);
	return memberLineIds;
};

const findCampaignMembersForAudience = async (searchParams: audienceCampaignSearchType) => {
	const listMember: Attributes<Member>[] = [];

	if (searchParams?.status === 'isWin') {
		const gifts = await db.gifts.findAll({
			where: {
				campaignId: searchParams?.campaignId,
				...(searchParams?.giftId
					? {
							giftId: {
								[Op.in]: searchParams?.giftId,
							},
					  }
					: {}),
			},
			include: [
				{
					association: db.gifts.associations.memberGifts,
					include: [
						{
							association: db.memberGifts.associations.Member,
						},
					],
				},
			],
		});

		gifts?.forEach((item) => {
			item?.memberGifts?.forEach((i) => {
				listMember.push(i?.Member as Attributes<Member>);
			});
		});
		const memberLineIds = listMember.filter(
			(m, index) => m?.lineId != null && listMember?.findIndex((item) => item?.lineId === m?.lineId) === index,
		);

		return memberLineIds;
	}
	if (searchParams?.status === 'notWin') {
		const registrations = await db.registrations.findAll({
			where: {
				campaignId: searchParams?.campaignId,
				'$memberGifts.registrationId$': null,
			},
			include: [
				{
					required: false,
					association: db.registrations.associations.memberGifts,
				},
				{
					association: db.registrations.associations.Member,
				},
			],
		});
		registrations?.forEach((item) => {
			listMember.push(item?.Member as Attributes<Member>);
		});

		const memberLineIds = listMember.filter(
			(m, index) => m?.lineId != null && listMember?.findIndex((item) => item?.lineId === m?.lineId) === index,
		);

		return memberLineIds;
	}

	const registrations = await db.registrations.findAll({
		where: {
			campaignId: searchParams?.campaignId
				? searchParams?.campaignId
				: {
						[Op.not]: null,
				  },
		},
		include: [
			{
				association: db.registrations.associations.Member,
			},
		],
	});

	registrations?.forEach((item) => {
		listMember.push(item?.Member as Attributes<Member>);
	});

	const memberLineIds = listMember.filter(
		(m, index) => m?.lineId != null && listMember?.findIndex((item) => item?.lineId === m?.lineId) === index,
	);

	return memberLineIds;
};

const generateAudienceRemarks = (questions: CampaignQuestion[], searchparams: audienceSearchType) => {
	const result: any = {};
	for (const [key, value] of Object.entries(searchparams)) {
		switch (key) {
			case 'questions':
				if (Array.isArray(value) && value.length > 0) {
					result.questions = [];
					value.forEach((v) => {
						const foundQuestion = questions.find((q) => q.campaignQuestionId == v.questionId);
						if (foundQuestion == undefined) {
							return;
						} else {
							result.questions.push({
								questionId: foundQuestion.campaignQuestionId,
								contents: foundQuestion.contents,
								value: v.value,
							});
						}
					});
				}
				break;
			default:
				break;
		}
	}
	return result;
};

export class LCH {
	static CreateTextMessage(t: string) {
		let msg: TextMessage = { type: 'text', text: '' };
		if (t == null) return msg;
		else msg = { type: 'text', text: t };
		return msg;
	}
	static CreateFlexText(t: string, wrap = true, align: 'start' | 'center' | 'end' = 'start'): FlexText {
		return {
			type: 'text',
			text: t,
			wrap: wrap,
			align: align,
		};
	}
}

interface FollowerResponse {
	userIds: string[];
	next?: string;
}

export const getFollowerIds = async () => {
	const accessToken = lineConfig.LINE_CHANNEL_ACCESS_TOKEN;
	const url = 'https://api.line.me/v2/bot/followers/ids';
	const headers = {
		Authorization: `Bearer ${accessToken}`,
	};
	let accumulatedIds: string[] = [];
	const params = { limit: 1000 };

	try {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			const { data } = await axios.get<any, AxiosResponse<FollowerResponse>>(url, {
				headers,
				params: params,
			});
			const { userIds } = data;
			accumulatedIds = [...accumulatedIds, ...userIds];
			if (!data.next) break;
			set(params, 'start', data.next);
		}
		return accumulatedIds;
	} catch (error) {
		if (axios.isAxiosError(error)) {
			console.error('Error fetching follower IDs:', error.response?.data || error.message);
		} else if (error instanceof Error) {
			console.error('Error:', error.message);
		} else {
			console.error('Unknown error:', error);
		}
		throw error;
	}
};

type AudienceMemberCardData = {
	name: string;
	audiences: { id: string }[];
	searchCondition: Record<string, string>;
};
export const createAudienceMemberHandler = async (data: AudienceMemberCardData) => {
	const { name, audiences, searchCondition } = data;

	if (await db.audiences.findOne({ raw: true, where: { description: name, type: AUDIENCE_TYPE.MEMBER } })) {
		throw new AppError(CONFLICT_ERROR, 'オーディエンス名が重複しています');
	}

	const audienceAPI = await lineBotClient.createUploadAudienceGroup({
		description: name,
		audiences: audiences,
	});

	const audience = await db.audiences.create({
		audienceGroupId: audienceAPI.audienceGroupId,
		description: name,
		audienceCount: audiences.length,
		searchCondition: searchCondition,
		type: AUDIENCE_TYPE.MEMBER,
	});

	return merge(
		{ status: AUDIENCE_STATUS.IN_PROGRESS },
		audience.toJSON(),
		pick(audienceAPI, ['created', 'expireTimestamp']),
	);
};

const createCondition = (field: string, value?: null | string | number, operator: symbol = Op.eq) => {
	if (value === undefined) return null;
	return { [field]: { [operator]: value } };
};
const searchEventConditionSchema = z.object({
	categoryId: z.number().optional(),
	occasionId: z.number().optional(),
	participationStatus: z
		.enum([
			AUDIENCE_PARTICIPATION_STATUS.CANCEL,
			AUDIENCE_PARTICIPATION_STATUS.PARTICIPATE,
			AUDIENCE_PARTICIPATION_STATUS.RESERVE,
		])
		.optional(),
	address: z.string().optional(),
	occurrenceStartAt: z.string().optional(),
	occurrenceEndAt: z.string().optional(),
	memberSinceMin: z.string().optional(),
	memberSinceMax: z.string().optional(),
});
type SearchEventConditionType = z.infer<typeof searchEventConditionSchema>;
type SearchEventResultType = Record<'id', string>[];
export const searchEventAudienceHandler = async (
	searchCondition: SearchEventConditionType,
): Promise<SearchEventResultType> => {
	const parsed = searchEventConditionSchema.safeParse(searchCondition);

	if (!parsed.success) throw new AppError(BAD_REQUEST, 'invalid parameters');

	const customerRegistrations = await db.customerRegistrations.findAll({
		raw: true,
		where: {
			[Op.or]: [{ isAddress: true }, { isZipCode: true }],
		},
		attributes: ['customerRegistrationId', 'isAddress', 'isZipCode'],
	});

	const addressField = customerRegistrations.find((field) => field.isAddress);
	const zipCodeField = customerRegistrations.find((field) => field.isZipCode);
	const rightJoin = !!(
		searchCondition.categoryId ||
		searchCondition.occasionId ||
		searchCondition.participationStatus ||
		searchCondition.occurrenceStartAt ||
		searchCondition.occurrenceEndAt
	);

	const members: Member[] = await db.members.findAll({
		where: {
			[Op.and]: [
				createCondition('lineId', null, Op.not),
				createCondition('$registrations.categoryId$', searchCondition.categoryId),
				createCondition('$registrations.occasionId$', searchCondition.occasionId),
				createCondition('$registrations.Occurrence.startAt$', searchCondition.occurrenceStartAt, Op.gte),
				createCondition('$registrations.Occurrence.endAt$', searchCondition.occurrenceEndAt, Op.lte),
				createCondition('memberSince', searchCondition.memberSinceMin, Op.gte),
				createCondition('memberSince', searchCondition.memberSinceMax, Op.lte),
				...(searchCondition.participationStatus
					? [
							searchCondition.participationStatus === AUDIENCE_PARTICIPATION_STATUS.CANCEL
								? { '$registrations.cancelledAt$': { [Op.not]: null } }
								: {},
							searchCondition.participationStatus === AUDIENCE_PARTICIPATION_STATUS.PARTICIPATE
								? { '$registrations.attended$': { [Op.is]: true } }
								: {},
							searchCondition.participationStatus === AUDIENCE_PARTICIPATION_STATUS.RESERVE
								? {
										[Op.and]: [
											{ '$registrations.cancelledAt$': { [Op.is]: null } },
											{ '$registrations.attended$': { [Op.is]: false } },
										],
								  }
								: {},
					  ]
					: []),
				searchCondition.address
					? [
							{
								[Op.or]: [
									{
										[`customerRegistrationId${addressField?.customerRegistrationId}`]: {
											[Op.like]: `%${searchCondition.address}%`,
										},
									},
									{
										[`customerRegistrationId${zipCodeField?.customerRegistrationId}`]: {
											[Op.like]: `%${searchCondition.address}%`,
										},
									},
								],
							},
					  ]
					: [],
			].filter((condition) => condition !== null),
		} as WhereAttributeHash<Member>,
		attributes: [
			//
			[Sequelize.fn('DISTINCT', Sequelize.col('lineId')), 'lineId'],
		],
		include: [
			{
				association: Member.associations.registrations,
				attributes: [],
				right: rightJoin,
				paranoid: false,
				include: [
					{
						association: db.registrations.associations.Occurrence,
						attributes: [],
					},
				],
			},
		],
		raw: true,
	});

	return members.map((member) => ({ id: member.lineId as string }));
};

export const createAudienceSchema = z.object({
	description: z.string(),
	audiences: z.array(z.object({ id: z.string() })),
	type: z.nativeEnum(AUDIENCE_TYPE),
	searchCondition: searchEventConditionSchema, // use z.union([schema1, schema2, ...]) for many schema
});
type CreateAudienceSchemaType = z.infer<typeof createAudienceSchema>;
export const createAudienceHandler = async (data: CreateAudienceSchemaType): Promise<Audience> => {
	const parsedData = createAudienceSchema.safeParse(data);

	if (!parsedData.success) throw new AppError(BAD_REQUEST, 'invalid parameters');

	if (await db.audiences.findOne({ raw: true, where: { description: data.description, type: data.type } })) {
		throw new AppError(CONFLICT_ERROR, 'オーディエンス名が重複しています');
	}

	const audienceAPI = await lineBotClient.createUploadAudienceGroup({
		description: data.description,
		audiences: data.audiences,
	});

	const audience = await db.audiences.create({
		audienceGroupId: audienceAPI.audienceGroupId,
		description: data.description,
		audienceCount: data.audiences.length,
		searchCondition: data.searchCondition,
		type: data.type,
	});

	emitAudience({ audienceGroupId: audienceAPI.audienceGroupId });

	return audience;
};

export const sendLineAfterRegistrationEvent = async ({
	registrationResult,
	messagesToClient,
	nameMember,
	memberLineId,
}: SendLineAfterRegistrationEvent) => {
	const { isMessage, afterReservationMessage } = registrationResult;
	const buildingInfo = registrationResult?.categoryTitle;
	const urlDetail = `https://liff.line.me/${process.env.LINE_LIFF_ID}?registrations=${registrationResult.registrationId}`;

	let regiMessage = isMessage
		? afterReservationMessage?.replace(replacerName, nameMember ?? '')
		: messagesToClient?.regiMessage?.valueString?.replace(replacerName, nameMember ?? '');

	const companyTelephone = messagesToClient?.companyTelephoneForTemplate?.valueString ?? '';

	regiMessage = regiMessage?.replace(
		replacerDateTime,
		registrationResult.startAt
			? moment(registrationResult.startAt)
					.tz(TIME_ZONE_DEFAULT)
					.locale('ja')
					.format(
						[
							'YYYY年M月D日（ddd）',
							!registrationResult.isSettingTime
								? `${moment(registrationResult.startAt).tz(TIME_ZONE_DEFAULT).format('HH:mm')}～${moment(
										registrationResult.startAt,
								  )
										.tz(TIME_ZONE_DEFAULT)
										.add(1, 'hour')
										.format('HH:mm')}`
								: null,
						]
							.filter(Boolean)
							.join(''),
					)
			: '',
	);
	regiMessage = regiMessage?.replace(replacerTelephoneCompany, `${companyTelephone ?? ''}`);
	regiMessage = regiMessage?.replace(replacerConfirmationUrl, '');
	regiMessage = regiMessage?.replace(replacerBuilding, `${buildingInfo}`);

	const content: FlexContainer = {
		type: 'bubble',
		body: {
			type: 'box',
			layout: 'vertical',
			contents: [
				{
					type: 'text',
					text: regiMessage || '',
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

	if (
		(messagesToClient.regiMessage &&
			messagesToClient.regiMessage.valueString &&
			registrationResult?.startAt &&
			memberLineId &&
			!isMessage) ||
		(isMessage && afterReservationMessage)
	) {
		await sendFlexMessage(memberLineId, content, regiMessage);
	}
};

export const sendLineToAdminAfterRegistrationEvent = async ({
	registrationResult,
	nameMember,
	phoneMember,
}: SendLineToAdminAfterRegistrationEvent) => {
	const registrationSpectators = await SpectatorService.listSpectatorsByWatch('registration');
	const buildingInfo = registrationResult?.categoryTitle;
	if (registrationSpectators.length > 0) {
		const spectatorLineIds = registrationSpectators.map((mS) => mS.Member.lineId as string);

		const watchMessageTemplate = await SettingService.getSpectatorNotificationTemplate(WATCH_MESSAGE_KEY_REGISTRATION); //REGISTRATION_WATCH_MESSAGE;
		if (watchMessageTemplate && watchMessageTemplate.valueString) {
			let watchMessage = watchMessageTemplate.valueString.replace(replacerName, `${nameMember ?? ''}`);
			watchMessage = watchMessage.replace(replacerBuilding, buildingInfo);
			watchMessage = watchMessage.replace(replacerTelephone, `${phoneMember ?? ''}`);

			if (registrationResult.startAt) {
				watchMessage = watchMessage.replace(
					replacerDateTime,
					registrationResult.startAt ? moment(registrationResult.startAt).format('YYYY年MM月DD日HH時mm分') : '',
				);
			}
			await sendMulticastMessage(spectatorLineIds, watchMessage);
		}
	}
	return true;
};
