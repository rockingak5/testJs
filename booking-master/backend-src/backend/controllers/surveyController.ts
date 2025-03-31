import { NextFunction, Request, Response } from 'express';
import json2csv from 'json2csv';
import { find, get, keyBy, map, pick, set } from 'lodash';
import path from 'path';

import { FileUtility, writeLog } from '~utilities';
import {
	CREATED,
	CUSTOMER_REGISTRATION_FIELD_IMAGE_LABEL,
	CUSTOMER_REGISTRATION_FIELD_TYPE,
	MEMBER_IS_FRIEND_LABEL,
	NO_CONTENT,
	RESPONSE_SUCCESS,
	systemConfig,
} from '../config';
import { memberSurveyRewardService, surveyService } from '../services';
import { formatDate } from '~utilities/commonDateTime';
import { SURVEY_IMAGE_FILE_NAME } from '~config';

function filterSimilarFieldNames(files: Express.Multer.File[]) {
	const regex = /^\[\d+\]\.options\[\d+\]\.image$/;
	return files.filter((file) => regex.test(file.fieldname));
}

export const createSurveys = async (req: Request, res: Response, next: NextFunction) => {
	const files = (req.files || []) as Express.Multer.File[];
	const surveyImage = files.find((file) => file.fieldname === SURVEY_IMAGE_FILE_NAME)?.filename || null;

	const templateOptionImages = filterSimilarFieldNames(files);

	try {
		let templates: any[] = [];
		if (req.body.templates) {
			templates = req.body.templates.map((templateString: any) => {
				const templateJson = JSON.parse(templateString);
				const optionsJson = JSON.parse(templateJson.options);

				return {
					...templateJson,
					options: optionsJson,
				};
			});
		}

		templateOptionImages.forEach((file) => {
			set(templates, file.fieldname, file.filename);
		});

		templates = templates.map((template) => ({
			...template,
			options: JSON.stringify(template.options),
		}));

		let expiration = null;
		if (req.body.expiration !== 'null') {
			expiration = req.body.expiration;
		}
		const { svname, pageType, messageReminder } = req.body;
		await surveyService.createSurvey({ svname, expiration, templates, surveyImage, pageType, messageReminder });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		if (surveyImage) {
			try {
				await FileUtility.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SURVEY, surveyImage));
			} catch (err) {
				writeLog({ msg: 'delete survey image file', err: err }, 'error');
			}
		}
		if (templateOptionImages && templateOptionImages.length) {
			try {
				for (const file of templateOptionImages) {
					await FileUtility.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SURVEY, file.filename));
				}
			} catch (err) {
				writeLog({ msg: 'delete survey image file', err: err }, 'error');
			}
		}
		next(e);
	}
};

export const getSurveyBySurveyId = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyId = parseInt(req.params.surveyId);
		const survey = await surveyService.getSurveyBySurveyId(surveyId);
		res.json(survey);
	} catch (e) {
		next(e);
	}
};

export const getDetailSurvey = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyId = parseInt(req.params.surveyId);
		const survey = await surveyService.getDetailSurvey(surveyId);
		res.json(survey);
	} catch (e) {
		next(e);
	}
};

export const getAllSurveyWithPagination = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const page = parseInt(req.query.page as string) || 1;
		const pageSize = parseInt(req.query.pageSize as string) || 10;
		const surveys = await surveyService.getAllSurveyWithPagination(page, pageSize);
		res.json(surveys);
	} catch (e) {
		next(e);
	}
};

export const delSurveyBySurveyId = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyId = parseInt(req.params.surveyId);
		await surveyService.delSurveyBySurveyId(surveyId);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};

export const updateSurveyById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyId = parseInt(req.params.surveyId);
		const newData = req.body;
		const updatedSurvey = await surveyService.updateSurveyById(surveyId, newData);
		res.json(updatedSurvey);
	} catch (e) {
		next(e);
	}
};

export const editSurvey = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyId = parseInt(req.params.surveyId);
		const newData = req.body;

		const files = (req.files || []) as Express.Multer.File[];
		const surveyImage = files.find((file) => file.fieldname === SURVEY_IMAGE_FILE_NAME)?.filename || null;

		const templateOptionImages = filterSimilarFieldNames(files);

		let templates: any[] = [];
		if (newData.templates) {
			templates = newData.templates.map((templateString: string) => {
				const templateJson = JSON.parse(templateString);
				const optionsJson = JSON.parse(templateJson.options);

				return {
					...templateJson,
					options: optionsJson,
				};
			});

			const imagesRemoved = templates
				.filter((it) => {
					return it.oldSurveyImage !== it.questionImage && it.oldSurveyImage;
				})
				?.map((it) => it?.oldSurveyImage);

			if (imagesRemoved.length > 0) {
				for (const imageRemoved of imagesRemoved) {
					await FileUtility.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SURVEY, imageRemoved));
				}
			}

			templateOptionImages.forEach((file) => {
				set(templates, file.fieldname, file.filename);
			});

			templates = templates.map((template) => ({
				...template,
				options: JSON.stringify(template.options),
			}));
		}
		newData.surveyImage = surveyImage;
		newData.templates = templates;
		if (newData.expiration === 'null') {
			newData.expiration = null;
		}
		const updatedSurvey = await surveyService.editSurvey(
			surveyId,
			pick(newData, [
				'svname',
				'expiration',
				'templates',
				'surveyImage',
				'isChangeImage',
				'messageReminder',
				'pageType',
			]),
		);
		res.status(CREATED).json(updatedSurvey);
	} catch (e) {
		next(e);
	}
};

export const deleteSurvey = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyId = parseInt(req.params.surveyId);
		await surveyService.deleteSurvey(surveyId);
		res.sendStatus(NO_CONTENT);
	} catch (e) {
		next(e);
	}
};

export const statisticsSurvey = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyId = parseInt(req.params.surveyId);
		const statistics = await surveyService.statisticsSurvey(surveyId);
		res.json(statistics);
	} catch (e) {
		next(e);
	}
};

export const statisticsSurveyExport = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyId = parseInt(req.params.surveyId);
		const { customRegistrations, members, survey } = await surveyService.statisticsSurveyExport(surveyId);
		const surveyTemplates = survey.SurveyTemplates!;
		const memberIds = members.map((member) => get(member.toJSON(), 'id')) as unknown as number[];
		const memberSurveyRewards = await memberSurveyRewardService.getMemberSurveyRewardBySurveyId(surveyId, memberIds);

		const userData = members.map((member: any) => {
			const memberJSON = member.toJSON();
			const records = memberJSON.SurveyRecords.map((record: any) => record);

			const surveyRecordMappingTemplateId = keyBy(records, 'templateId');
			const memberId = get(memberJSON, 'id');

			return {
				会員ID: memberId,
				会員コード: get(memberJSON, 'memberCode'),
				LINE名: get(memberJSON, 'lineName'),
				LINEフォロー状態: memberJSON.isFriends ? MEMBER_IS_FRIEND_LABEL.IS_FRIEND : MEMBER_IS_FRIEND_LABEL.NOT_FRIEND,
				アンケート名: get(survey, 'name'),
				アンケート回答番号: get(find(memberSurveyRewards, { memberId }), 'surveyRewardCode'),
				...customRegistrations.reduce((prev, curr) => {
					const { type, customerRegistrationId, label: key } = curr;
					let value = get(memberJSON, `customerRegistrationId${customerRegistrationId}`, '');

					switch (type) {
						case CUSTOMER_REGISTRATION_FIELD_TYPE.CHECKBOX:
							value = map(get(memberJSON, `customerRegistrationId${customerRegistrationId}`, []), (record) =>
								get(record, 'value', ''),
							)
								.filter(Boolean)
								.join(', ');
							break;

						case CUSTOMER_REGISTRATION_FIELD_TYPE.IMAGE:
							value = value
								? CUSTOMER_REGISTRATION_FIELD_IMAGE_LABEL.EXIST
								: CUSTOMER_REGISTRATION_FIELD_IMAGE_LABEL.NOT_EXIST;
							break;
						case CUSTOMER_REGISTRATION_FIELD_TYPE.RADIO:
							value = get(memberJSON, `customerRegistrationId${customerRegistrationId}.value`, '');
							break;

						default:
							break;
					}

					return { ...prev, [key]: value };
				}, {}),
				備考欄: get(member, 'notes', '') as string,
				来店回数: `${get(member, 'countVisit', 'ー')}回`,
				最終来店日: formatDate(member?.lastVisit),
				ポイント: get(member, 'currentPoints', '0') as string,
				友だち登録日: formatDate(member?.createdAt),
				会員登録日: formatDate(member?.memberSince),
				有効期限: formatDate(member?.activeUntil),
				...surveyTemplates.reduce((prev, template) => {
					const key = template.label;
					let value = get(surveyRecordMappingTemplateId, `${(template as any).id}.value`, '');
					try {
						const valueObj = JSON.parse(value);
						if (Array.isArray(valueObj)) {
							value = valueObj
								.map((it) => {
									try {
										const itObj = JSON.parse(it);
										if (typeof itObj === 'object') {
											return itObj.other;
										}
										return itObj;
									} catch (err) {
										return it;
									}
								})
								.join(', ');
						} else {
							value = valueObj.other;
						}
					} catch (err) {
						/* empty */
					}
					return {
						...prev,
						[key]: value,
					};
				}, {}),
			};
		});

		const fields = [
			//
			'会員ID',
			'会員コード',
			'LINE名',
			'LINEフォロー状態',
			...customRegistrations.map(({ label }) => label),
			'備考欄',
			'来店回数',
			'最終来店日',
			'ポイント',
			'友だち登録日',
			'会員登録日',
			'有効期限',
			'アンケート名',
			'アンケート回答番号',
			...surveyTemplates.map(({ label }) => label),
		];

		const opts = { fields: fields, withBOM: true, excelStrings: true };
		const csvData = json2csv.parse(userData, opts);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', `attachment; filename=survey-${(survey as any).id}.csv`);
		res.status(RESPONSE_SUCCESS).end(csvData);
	} catch (e) {
		next(e);
	}
};

export const uploadSurveyQuestionImage = async (req: Request, res: Response, next: NextFunction) => {
	const questionImage = req.file?.filename || '';
	try {
		res.status(RESPONSE_SUCCESS).json({ questionImage });
	} catch (e) {
		if (questionImage) {
			try {
				await FileUtility.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SURVEY, questionImage));
			} catch (err) {
				writeLog({ msg: 'delete survey image file', err: err }, 'error');
			}
		}
		next(e);
	}
};

export const removeSurveyQuestionImage = async (req: Request, res: Response, next: NextFunction) => {
	const questionImage = req.body.questionImage || '';
	try {
		await FileUtility.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SURVEY, questionImage));
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
