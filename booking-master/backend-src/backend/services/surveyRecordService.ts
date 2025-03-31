import { db } from '../models';

export const createSurveyRecord = async (memberId: number, surveyId: number, type: string, content: string) => {
	try {
		const newSurveyRecord = await db.surveyRecord.create({ memberId, surveyId, type, content });
		return newSurveyRecord;
	} catch (error) {
		console.error('Error occurred while creating survey record:', error);
		throw error;
	}
};

export const getSurveyRecordById = async (rcId: number) => {
	try {
		const surveyRecord = await db.surveyRecord.findByPk(rcId);
		return surveyRecord;
	} catch (error) {
		console.error('Error occurred while fetching survey record by ID:', error);
		throw error;
	}
};

export const updateSurveyRecordById = async (
	rcId: number,
	newData: Partial<{ memberId: number; surveyId: number; type: string; content: string }>,
) => {
	const surveyRecord = await db.surveyRecord.findByPk(rcId);

	if (!surveyRecord) {
		throw new Error('Survey record not found');
	}
	await surveyRecord.update(newData);
	return surveyRecord;
};

export const deleteSurveyRecordById = async (rcId: number) => {
	try {
		const deletedSurveyRecord = await db.surveyRecord.destroy({ where: { rcId } });
		return deletedSurveyRecord;
	} catch (error) {
		console.error('Error occurred while deleting survey record by ID:', error);
		throw error;
	}
};
