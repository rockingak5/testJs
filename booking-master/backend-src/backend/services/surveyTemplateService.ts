import { db } from '../models';

export const createSurveyTemplate = async (
	surveyId: number,
	type: string,
	label: string,
	required: number,
	isDisplayed: number,
	isDelete: number,
	options: any,
) => {
	try {
		// Find the latest row (same logic as before)
		const latestTemplate = await db.surveyTemplate.findOne({
			where: { surveyId },
			order: [['showOrder', 'DESC']],
			attributes: ['showOrder'],
		});

		const newShowOrder = latestTemplate ? latestTemplate.showOrder + 1 : 1;

		// Convert options to JSON string
		const optionsJSON = JSON.stringify(options);

		// Create the new row
		const newSurveyTemplate = await db.surveyTemplate.create({
			surveyId,
			type,
			label,
			required,
			isDisplayed,
			isDelete,
			options: optionsJSON,
			showOrder: newShowOrder,
		});

		return newSurveyTemplate;
	} catch (error) {
		console.error('Error occurred while creating survey template:', error);
	}
};

export const getSurveyTemplateById = async (tpId: number) => {
	try {
		const surveyTemplate = await db.surveyTemplate.findByPk(tpId);
		return surveyTemplate;
	} catch (error) {
		console.error('Error occurred while fetching survey template by ID:', error);
		throw error;
	}
};

export const updateSurveyTemplateById = async (
	tpId: number,
	newData: Partial<{
		surveyId: number;
		type: string;
		label: string;
		showOrder: number;
		required: number;
		isDisplayed: number;
		isDelete: number;
		option: any;
	}>,
) => {
	const surveyTemplate = await db.surveyTemplate.findByPk(tpId);

	if (!surveyTemplate) {
		throw new Error('Survey template not found');
	}
	await surveyTemplate.update(newData);
	return surveyTemplate;
};
export const updateSurveyTemplateOrder = async (req: any) => {
	for (const item of req.surveyTemplateOrder) {
		const tpId = item.tpId;
		const showOrder = item.showOrder;

		const surveyTemplate = await db.surveyTemplate.findOne({
			where: {
				tpId,
				surveyId: req.surveyId,
			},
		});

		if (!surveyTemplate) {
			throw new Error(`Survey template with tpId ${tpId} and surveyId ${req.surveyId} not found`);
		}

		await surveyTemplate.update({ showOrder });
	}

	// Trả về thông báo khi hoàn thành cập nhật
	return 'Survey template orders updated successfully';
};

export const deleteSurveyTemplateById = async (tpId: number) => {
	try {
		const deletedSurveyTemplate = await db.surveyTemplate.destroy({ where: { tpId } });
		return deletedSurveyTemplate;
	} catch (error) {
		console.error('Error occurred while deleting survey template by ID:', error);
		throw error;
	}
};

export const getAllQuestionTemplate = async (surveyId: string) => {
	try {
		const getall = await db.surveyTemplate.findAll({
			where: { surveyId: surveyId },
			order: [['showOrder', 'ASC']], // Sắp xếp theo showOrder tăng dần (ASC)
		});
		return getall;
	} catch (error) {
		console.error('Error occurred while retrieving survey templates by survey ID:', error);
		throw error;
	}
};
