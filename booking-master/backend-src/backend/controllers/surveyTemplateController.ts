import { NextFunction, Request, Response } from 'express';
import { RESPONSE_SUCCESS } from '../config';
import { surveyTemplateService } from '../services';

export const createSurveyTemplate = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { surveyId, type, label, required, isDisplayed, isDelete, options } = req.body;
		await surveyTemplateService.createSurveyTemplate(surveyId, type, label, required, isDisplayed, isDelete, options);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
export const updateSurveyTemplateOrder = async (req: Request, res: Response, next: NextFunction) => {
	try {
		await surveyTemplateService.updateSurveyTemplateOrder(req.body);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};

export const getSurveyTemplateById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const tpId = parseInt(req.params.tpId);
		const surveyTemplate = await surveyTemplateService.getSurveyTemplateById(tpId);
		res.json(surveyTemplate);
	} catch (e) {
		next(e);
	}
};
export const getAllQuestionTemplate = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const surveyTemplate = await surveyTemplateService.getAllQuestionTemplate(req.params.surveyId);
		res.json(surveyTemplate);
	} catch (e) {
		next(e);
	}
};

export const updateSurveyTemplateById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const tpId = parseInt(req.params.tpId);
		const newData = req.body;
		const updatedSurveyTemplate = await surveyTemplateService.updateSurveyTemplateById(tpId, newData);
		res.json(updatedSurveyTemplate);
	} catch (e) {
		next(e);
	}
};

export const deleteSurveyTemplateById = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const tpId = parseInt(req.params.tpId);
		await surveyTemplateService.deleteSurveyTemplateById(tpId);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
