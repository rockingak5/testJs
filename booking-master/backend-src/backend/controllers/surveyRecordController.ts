import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import { get } from 'lodash';

import { PERMISSION_ERROR, RESPONSE_SUCCESS, systemConfig } from '../config';
import { db } from '../models';
import { LineService, memberSurveyRewardService, surveyRecordService } from '../services';
import moment from 'moment';
import { genMessageReminderSurvey, getSurveyRewardCode } from '~utilities/survey.utils';

async function saveBase64ImageToFile(base64Data: string, filePath: string, maxFileSize: number = 5 * 1024 * 1024) {
	try {
		// Validate input
		if (!base64Data) {
			throw new Error('Invalid base64 data');
		}

		const base64String = base64Data.split(';base64,').pop();
		if (!base64String) {
			throw new Error('Invalid base64 string');
		}

		// Check file size
		const fileSize = Buffer.byteLength(base64String, 'base64');
		if (fileSize > maxFileSize) {
			throw new Error(`File size exceeds maximum allowed limit of ${maxFileSize / (1024 * 1024)} MB`);
		}

		// Create file buffer
		const fileBuffer = Buffer.from(base64String, 'base64');

		// Write file using promises
		await fs.promises.writeFile(filePath, fileBuffer);
	} catch (error) {
		console.error('Error saving image:', error);
		throw error; // Re-throw to allow for proper handling in calling code
	}
}

export const createSurveyRecord = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const data = req.body.data;

		const surveyId = get(data, '0.surveyId');

		if (!surveyId) {
			res.sendStatus(PERMISSION_ERROR);
			return;
		}

		const survey = await db.surveys.findOne({
			where: { surveyId },
			raw: true,
			attributes: ['expiration', 'messageReminder', 'totalRespondents'],
		});

		if (!survey) {
			res.sendStatus(PERMISSION_ERROR);
			return;
		}

		if (moment().isAfter(survey.expiration)) {
			res.sendStatus(PERMISSION_ERROR);
			return;
		}

		for (const record of data) {
			const existingRecord = await db.surveyRecord.findOne({
				where: {
					tpId: record.tpId,
					lineUserId: record.lineUserId,
					surveyId: record.surveyId,
				},
			});
			if (existingRecord) {
				res.sendStatus(PERMISSION_ERROR);
				return; // Return here to avoid further processing
			}
		}

		const records = req.body.data.map(async (record: any) => {
			let content = record.content;
			if (typeof content === 'string' && content.startsWith('data:image')) {
				const path = systemConfig.PATH_FILE_UPLOAD_SETTING as string;
				const fileName = `${Date.now()}.png`;
				const filePath = `${path}/${fileName}`;
				await saveBase64ImageToFile(content, filePath);
				content = fileName;
			}
			return {
				rcId: null,
				tpId: record.tpId,
				lineUserId: record.lineUserId,
				content: content,
				surveyId: record.surveyId,
			};
		});

		const processedRecords = await Promise.all(records);
		await db.surveyRecord.bulkCreate(processedRecords);

		const surveyRewardCode = getSurveyRewardCode(surveyId, survey.totalRespondents);
		const lineId = get(data, '0.lineUserId');
		const member = await db.members.findOne({
			where: { lineId },
			attributes: ['memberId', 'customerRegistrationId1', 'displayName'],
		});

		if (member) {
			await memberSurveyRewardService.createMemberSurveyReward({
				surveyRewardCode,
				memberId: member.memberId,
				surveyId,
			});
		}

		if (survey.messageReminder) {
			let name = get(member?.toJSON(), 'customerRegistrationId1', '');
			if (!name) {
				name = get(member?.toJSON(), 'displayName') || '';
			}
			const messageSendSurveyCompleted = genMessageReminderSurvey({
				name,
				rewardCode: surveyRewardCode,
				messageReminder: survey.messageReminder,
			});

			LineService.sendTextMessage(lineId as string, messageSendSurveyCompleted);
		}

		await db.surveys.increment({ totalRespondents: 1 }, { where: { surveyId } });

		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
export const getSurveyRecordById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const rcId = parseInt(req.params.rcId);
		const surveyRecord = await surveyRecordService.getSurveyRecordById(rcId);
		res.json(surveyRecord);
	} catch (e) {
		next(e);
	}
};
export const checkSurveyRecord = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const [lineUserId, surveyId] = req.body;
		const existingRecord = await db.surveyRecord.findOne({
			where: {
				lineUserId: lineUserId,
				surveyId: surveyId,
			},
		});
		if (existingRecord) {
			res.json({ exists: true });
		} else {
			res.json({ exists: false });
		}
	} catch (e) {
		next(e);
	}
};

export async function getAllSurveyRecordsWithPaginationBylineUserIdAndsurveyId(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const { surveyId } = req.params;

		const surveyRecords = await db.surveyRecord.findAll({
			where: {
				surveyId: surveyId,
			},
			include: [
				{
					model: db.surveyTemplate,
					as: 'SurveyTemplate',
				},
			],
		});

		const result: Record<string, any> = {};
		const memberDisplayNamesPromises = surveyRecords.map(async (record: any) => {
			const lineUserId = record.lineUserId;
			result[lineUserId] = result[lineUserId] || []; // Initialize or retrieve the array
			const member = await db.members.findOne({ where: { lineId: lineUserId } });
			if (member) {
				result[lineUserId].push({
					tpId: record.tpId,
					name: member.displayName, // Access displayName here
					content: record.content,
					surveyId: record.surveyId,
					type: (record as any).SurveyTemplate.type,
					label: (record as any).SurveyTemplate.label,
					showOrder: (record as any).SurveyTemplate.showOrder,
					required: (record as any).SurveyTemplate.required,
					isDisplayed: (record as any).SurveyTemplate.isDisplayed,
					isDelete: (record as any).SurveyTemplate.isDelete,
					options: (record as any).SurveyTemplate.options,
					createdAt: record.createdAt,
					updatedAt: record.updatedAt,
				});
			} else {
				// Handle the case where member is not found
			}
		});

		await Promise.all(memberDisplayNamesPromises);

		for (const lineUserId in result) {
			if (result.hasOwnProperty(lineUserId)) {
				result[lineUserId].sort((a: any, b: any) => a.showOrder - b.showOrder);
			}
		}

		res.json(result);
	} catch (e) {
		next(e);
	}
}

interface MergedItem {
	tpId: string;
	content: any[];
}
function mergeUserData(userData: Record<string, any[]>): MergedItem[] {
	const mergedData: MergedItem[] = [];

	for (const userId in userData) {
		const userDataList = userData[userId];

		userDataList.forEach((item) => {
			const existingItemIndex = mergedData.findIndex((existingItem) => existingItem.tpId === item.tpId);
			if (existingItemIndex !== -1) {
				// If item with same tpId already exists, merge contents
				if (!Array.isArray(mergedData[existingItemIndex].content)) {
					mergedData[existingItemIndex].content = [mergedData[existingItemIndex].content];
				}
				if (!Array.isArray(item.content)) {
					item.content = [item.content];
				}
				mergedData[existingItemIndex].content.push(...item.content);
			} else {
				// Otherwise, add new item to mergedData
				mergedData.push(item);
			}
		});
	}

	return mergedData;
}

export async function getAllSurveyRecordsBylineUserIdAndsurveyId(req: Request, res: Response, next: NextFunction) {
	try {
		const { surveyId } = req.params;

		const surveyRecords = await db.surveyRecord.findAll({
			where: {
				surveyId: surveyId,
			},
			include: [
				{
					model: db.surveyTemplate,
					as: 'SurveyTemplate',
				},
			],
		});

		const result: Record<string, any> = {};
		surveyRecords.forEach((record) => {
			const surveyRecordId = (record as any).lineUserId;
			if (!result[surveyRecordId]) {
				result[surveyRecordId] = [];
			}
			result[surveyRecordId].push({
				tpId: record.tpId,
				content: record.content,
				surveyId: record.surveyId,
				type: (record as any).SurveyTemplate.type,
				label: (record as any).SurveyTemplate.label,
				showOrder: (record as any).SurveyTemplate.showOrder,
				required: (record as any).SurveyTemplate.required,
				isDisplayed: (record as any).SurveyTemplate.isDisplayed,
				isDelete: (record as any).SurveyTemplate.isDelete,
				options: (record as any).SurveyTemplate.options,
				createdAt: record.createdAt,
				updatedAt: record.updatedAt,
			});
		});
		const reqs = mergeUserData(result);
		res.json(reqs);
	} catch (e) {
		next(e);
	}
}

export const updateSurveyRecordById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const rcId = parseInt(req.params.rcId);
		const newData = req.body;
		const updatedSurveyRecord = await surveyRecordService.updateSurveyRecordById(rcId, newData);
		res.json(updatedSurveyRecord);
	} catch (e) {
		next(e);
	}
};

export const deleteSurveyRecordById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const rcId = parseInt(req.params.rcId);
		await surveyRecordService.deleteSurveyRecordById(rcId);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
