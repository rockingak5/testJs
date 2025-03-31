import { Op, Sequelize } from 'sequelize';

import { db } from '../models';
import { FileUtility, writeLog } from '~utilities';
import path from 'path';
import {
	CUSTOMER_REGISTRATION_FIELD_TYPE,
	OPTION_SUBMIT_SURVEY_VALUE,
	SURVEY_NAVIGATION_TYPE,
	SURVEY_PAGE_TYPE,
	SURVEY_TEMPLATE_TYPE,
	systemConfig,
} from '~config';
import _ from 'lodash';
import { SurveyTemplate } from '~models/surveyTemplateModel';

export const createSurvey = async ({
	svname,
	expiration,
	templates,
	surveyImage,
	pageType,
	messageReminder,
}: {
	svname: string;
	expiration: Date;
	templates: any[];
	surveyImage: string | null;
	pageType: SURVEY_PAGE_TYPE;
	messageReminder: string | null;
}) => {
	const transaction = await db.sequelize.transaction();

	try {
		// if ((await db.surveys.count()) >= 5) {
		// 	throw new Error('Cannot create more than 5 surveys');
		// }

		const newSurvey = await db.surveys.create(
			{
				svname,
				expiration,
				SurveyTemplates: templates.map((it) => _.omit(it, 'tpId', 'isCreateNew')) as any,
				surveyImage,
				messageReminder,
				pageType,
			},
			{
				include: [
					{
						model: db.surveyTemplate,
					},
				],
				transaction,
			},
		);

		const surveyTemplates = newSurvey.SurveyTemplates || [];

		for (let i = 0; i < surveyTemplates.length - 1; i++) {
			const currentSurveyTemplate = surveyTemplates[i];
			if (
				currentSurveyTemplate.navigationType === SURVEY_NAVIGATION_TYPE.CONDITIONAL_BRANCHING &&
				currentSurveyTemplate.options
			) {
				let optionsObj = JSON.parse(currentSurveyTemplate.options);
				optionsObj = optionsObj.map((opObj: any) => {
					const nextQuestionId = opObj?.nextQuestionId;
					if (nextQuestionId && nextQuestionId !== OPTION_SUBMIT_SURVEY_VALUE) {
						const nextQuestionId = opObj.nextQuestionId;
						const templateNextQuestion = templates.find((it) => it.tpId === nextQuestionId);
						const templateCreated = surveyTemplates.find(
							(it) => it.showOrder === templateNextQuestion.showOrder,
						) as unknown as SurveyTemplate;
						opObj.nextQuestionId = templateCreated.tpId;
					}
					return opObj;
				});

				await db.surveyTemplate.update(
					{
						options: JSON.stringify(optionsObj),
					},
					{
						where: { tpId: currentSurveyTemplate.tpId },
						transaction,
					},
				);
			}

			if (currentSurveyTemplate.navigationType === SURVEY_NAVIGATION_TYPE.NEXT_SPECIFIED_QUESTION) {
				const dataTemplateCreate = templates.find((it) => it.tpId === currentSurveyTemplate.nextQuestionId);
				if (dataTemplateCreate && currentSurveyTemplate.nextQuestionId) {
					const templateCreated = surveyTemplates.find((svtp) => svtp.showOrder === dataTemplateCreate.showOrder);
					if (templateCreated) {
						await db.surveyTemplate.update(
							{
								nextQuestionId: templateCreated.tpId,
							},
							{
								where: { tpId: currentSurveyTemplate.tpId },
								transaction,
							},
						);
					}
				}
			}
		}

		await transaction.commit();

		return newSurvey;
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

export const getSurveyBySurveyId = async (surveyId: number) => {
	try {
		const survey = await db.surveys.findOne({
			where: { surveyId },
			include: [
				{
					model: db.surveyTemplate,
					order: [['showOrder', 'ASC']],
					attributes: ['type', 'label', 'showOrder', 'required', 'isDisplayed', 'options'],
				},
			],
			attributes: ['svname', 'expiration', 'surveyId', 'surveyImage', 'messageReminder', 'pageType'],
		});
		return survey;
	} catch (error) {
		console.error('Error occurred while fetching survey by survey ID:', error);
		throw error;
	}
};

export const getDetailSurvey = async (surveyId: number) => {
	try {
		const survey = await db.surveys.findOne({
			where: { surveyId },
			include: [
				{
					separate: true,
					model: db.surveyTemplate,
					order: [['showOrder', 'ASC']],
					attributes: [
						'type',
						'label',
						'showOrder',
						'required',
						'isDisplayed',
						'options',
						'isDelete',
						'tpId',
						'navigationType',
						'questionImage',
						'nextQuestionId',
					],
				},
			],
			attributes: ['svname', 'expiration', 'surveyImage', 'messageReminder', 'pageType'],
		});
		return survey;
	} catch (error) {
		console.error('Error occurred while fetching survey by survey ID:', error);
		throw error;
	}
};

export const getAllSurveyWithPagination = async (page: number, pageSize: number) => {
	try {
		const surveys = await db.surveys.findAndCountAll({
			limit: pageSize,
			offset: (page - 1) * pageSize,
			order: [['createdAt', 'DESC']],
		});
		for (const survey of surveys.rows) {
			const check = await db.surveyRecord.findOne({ where: { surveyId: survey.surveyId } });
			(survey as any).dataValues.answer = check ? 'yes' : 'no';
			const getall = await db.surveyTemplate.findAll({
				where: { surveyId: survey.surveyId },
				order: [['showOrder', 'ASC']],
			});
			(survey as any).dataValues.list = getall;
		}
		return surveys;
	} catch (error) {
		console.error('Error occurred while fetching all surveys with pagination:', error);
		throw error;
	}
};

export const delSurveyBySurveyId = async (surveyId: number) => {
	try {
		const deletedSurvey = await db.surveys.destroy({ where: { surveyId } });
		return deletedSurvey;
	} catch (error) {
		console.error('Error occurred while deleting survey by survey ID:', error);
		throw error;
	}
};
export const updateSurveyById = async (surveyId: number, newData: any) => {
	const survey = await db.surveys.findByPk(surveyId);
	const sv = { svname: newData.svname, expiration: newData.expiration };
	if (!survey) {
		throw new Error('Survey not found');
	}
	await survey.update(sv);
	const getall = await db.surveyTemplate.findAll({
		where: { surveyId: surveyId },
		order: [['showOrder', 'ASC']],
	});

	for (const one of getall) {
		let found = false;
		for (const item of newData.list) {
			if (one.tpId === item.tpId) {
				found = true;
				break;
			}
		}
		if (!found) {
			await db.surveyTemplate.destroy({ where: { tpId: one.tpId } });
		}
	}
	for (const item of newData.list) {
		if (item.tpId !== null) {
			const surveyTemplate = await db.surveyTemplate.findByPk(item.tpId);
			if (surveyTemplate) {
				await surveyTemplate.update(item);
			}
		} else {
			const latestTemplate = await db.surveyTemplate.findOne({
				where: { surveyId: surveyId },
				order: [['showOrder', 'DESC']],
				attributes: ['showOrder'],
			});

			const newShowOrder = latestTemplate ? latestTemplate.showOrder + 1 : 1;

			const optionsJSON = item.options;

			const newSurveyTemplate = await db.surveyTemplate.create({
				surveyId: surveyId,
				type: item.type,
				label: item.label,
				required: item.required,
				isDisplayed: item.isDisplayed,
				isDelete: item.isDelete,
				options: optionsJSON,
				showOrder: newShowOrder,
			});
		}
	}

	return survey;
};

export const editSurvey = async (surveyId: number, newData: any) => {
	const transaction = await db.sequelize.transaction();
	try {
		const { templates, isChangeImage, surveyImage, ...data } = newData;
		const survey = await db.surveys.findByPk(surveyId);
		if (!survey) {
			throw new Error('Survey not found');
		}

		if (survey.surveyImage && isChangeImage === 'true') {
			try {
				await FileUtility.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SURVEY, survey.surveyImage));
			} catch (err) {
				writeLog({ msg: 'delete survey image file update', err: err }, 'error');
			}
		}

		if (isChangeImage === 'true') {
			data.surveyImage = surveyImage;
		}

		await survey.update(data, { transaction });
		const newSurveyTemplates = await Promise.all(
			templates.map((template: any) => {
				let templateUpdate = template;
				if (template.isCreateNew) {
					templateUpdate = _.omit(template, 'tpId', 'isCreateNew');
				}
				return db.surveyTemplate.upsert(templateUpdate, {
					transaction,
					returning: true,
				});
			}),
		);

		for (const [currentSurveyTemplate, created] of newSurveyTemplates) {
			if (
				currentSurveyTemplate.navigationType === SURVEY_NAVIGATION_TYPE.CONDITIONAL_BRANCHING &&
				currentSurveyTemplate.options
			) {
				let optionsObj = JSON.parse(currentSurveyTemplate.options);
				optionsObj = optionsObj.map((opObj: any) => {
					if (opObj.nextQuestionId && opObj.nextQuestionId !== OPTION_SUBMIT_SURVEY_VALUE) {
						const nextQuestionId = opObj.nextQuestionId;
						const templateNextQuestion = templates.find((it: any) => it.tpId === nextQuestionId);
						const templateCreated = newSurveyTemplates.find((it: any) => {
							return it[0].showOrder === templateNextQuestion.showOrder;
						}) as unknown as SurveyTemplate[];
						opObj.nextQuestionId = templateCreated[0].tpId;
					}
					return opObj;
				});

				await db.surveyTemplate.update(
					{
						options: JSON.stringify(optionsObj),
					},
					{
						where: { tpId: currentSurveyTemplate.tpId },
						transaction,
					},
				);
			}

			if (currentSurveyTemplate.navigationType === SURVEY_NAVIGATION_TYPE.NEXT_SPECIFIED_QUESTION) {
				const dataTemplateCreate = templates.find((it: any) => it.tpId === currentSurveyTemplate.nextQuestionId);
				if (dataTemplateCreate && currentSurveyTemplate.nextQuestionId) {
					const templateCreated = newSurveyTemplates.find((item: any) => {
						const [svtp, createdSvtp] = item;
						return svtp.showOrder === dataTemplateCreate.showOrder && createdSvtp;
					});
					if (!_.isEmpty(templateCreated)) {
						await db.surveyTemplate.update(
							{
								nextQuestionId: templateCreated[0].tpId,
							},
							{
								where: { tpId: currentSurveyTemplate.tpId },
								transaction,
							},
						);
					}
				}
			}
		}

		await (survey as any).setSurveyTemplates(
			newSurveyTemplates.map(([result]) => result),
			{ transaction },
		);
		await db.surveyTemplate.destroy({ where: { surveyId: null }, transaction });
		await transaction.commit();

		const currentTemplateOptions = await db.surveyTemplate.findAll({
			where: {
				type: {
					[Op.in]: [SURVEY_TEMPLATE_TYPE.CHECKBOX, SURVEY_TEMPLATE_TYPE.RADIO],
				},
				surveyId,
			},
			attributes: ['options'],
			raw: true,
		});

		const currentTemplateOptionsJson = currentTemplateOptions
			.map((template) => template.options)
			.filter((options) => options !== undefined)
			.flatMap<{ image: string }>((options) => JSON.parse(options as string))
			.map((option) => option.image)
			.filter(Boolean);

		const dataTemplateUpdateOptionsJson = (templates as any[])
			.map((template) => template.options)
			.filter((options) => options !== undefined)
			.flatMap<{ image: string }>((options) => JSON.parse(options))
			.map((option) => option.image)
			.filter(Boolean);

		const filenamesToDelete = _.difference(currentTemplateOptionsJson, dataTemplateUpdateOptionsJson);

		for (const filename of filenamesToDelete) {
			try {
				await FileUtility.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SURVEY, filename));
			} catch (err) {
				writeLog({ msg: 'delete survey image file', err }, 'error');
			}
		}

		return survey;
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

export const deleteSurvey = async (surveyId: number) => {
	const transaction = await db.sequelize.transaction();
	try {
		await db.surveys.destroy({ where: { surveyId }, transaction });
		await transaction.commit();
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

export const statisticsSurvey = async (surveyId: number) => {
	try {
		return db.surveys.findOne({
			where: { surveyId },
			include: [
				{
					model: db.surveyTemplate,
					include: [
						{
							model: db.surveyRecord,
							attributes: [
								//
								'content',
								'lineUserId',
								'rcId',
							],
						},
					],
					attributes: [
						//
						'type',
						'label',
						'required',
						'isDisplayed',
						'options',
						'tpId',
					],
				},
			],
			attributes: [
				//
				['svname', 'name'],
				'expiration',
			],
			order: [[db.surveyTemplate, 'showOrder', 'ASC']],
		});
	} catch (error) {
		console.error('Error occurred while fetching survey by survey ID:', error);
		throw error;
	}
};

export const statisticsSurveyExport = async (surveyId: number) => {
	try {
		const survey = await db.surveys.findOne({
			where: { surveyId },
			include: [
				{
					model: db.surveyTemplate,
					separate: true,
					order: [['showOrder', 'ASC']],
					attributes: [
						//
						'type',
						'label',
						['tpId', 'id'],
					],
					where: { type: { [Op.ne]: CUSTOMER_REGISTRATION_FIELD_TYPE.NOTE } },
				},
			],
			attributes: [['svname', 'name']],
			// raw: true
		});

		if (!survey) {
			throw new Error('Survey not found');
		}

		const customRegistrations = await db.customerRegistrations.findAll({
			where: {
				isAdminDisplayed: true,
			},
			attributes: ['customerRegistrationId', 'label', 'type'],
			raw: true,
			order: [['showOrder', 'ASC']],
		});
		const members = await db.members.findAll({
			include: [
				{
					model: db.surveyRecord,
					attributes: [
						//
						['content', 'value'],
						[Sequelize.literal('`SurveyRecords->SurveyTemplate`.`label`'), 'label'],
						[Sequelize.literal('`SurveyRecords->SurveyTemplate`.`type`'), 'type'],
						[Sequelize.literal('`SurveyRecords->SurveyTemplate`.`tpId`'), 'templateId'],
						[Sequelize.literal('`SurveyRecords->SurveyTemplate`.`showOrder`'), 'showOrder'],
						[Sequelize.literal('`SurveyRecords->SurveyTemplate`.`options`'), 'options'],
					],
					include: [
						{
							model: db.surveyTemplate,
							where: { isDelete: false },
							attributes: [],
						},
					],
					where: { surveyId },
				},
			],
			attributes: [
				...customRegistrations.map(({ customerRegistrationId }) => `customerRegistrationId${customerRegistrationId}`),
				['memberId', 'id'],
				'memberCode',
				'lineId',
				['displayName', 'lineName'],
				'isFriends',
				'notes',
				'countVisit',
				'lastVisit',
				'currentPoints',
				'createdAt',
				'memberSince',
				'activeUntil',
			],
		});
		return { customRegistrations, members, survey: survey.toJSON() };
	} catch (error) {
		console.error('Error occurred while fetching survey by survey ID:', error);
		throw error;
	}
};
