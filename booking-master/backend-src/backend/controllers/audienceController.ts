import { NextFunction, Request, Response } from 'express';
import { RESPONSE_SUCCESS, SYSTEM_ERROR, CREATED } from '../config';
import { LineService, SocketServerService, audiencesService } from '../services';
import { AppError } from '../utilities';
import { Audience } from '~models/audienceModel';

export const listAudiences = async (req: Request, res: Response, next: NextFunction) => {
	const type = req.query.type as any;

	try {
		const audiences = await LineService.listAudiences(type || 'default');
		res.send(audiences);
	} catch (e) {
		next(e);
	}
};

export const listCampaignAudiences = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const audiences = await LineService.listAudiences('campaign');
		res.send(audiences);
	} catch (e) {
		next(e);
	}
};

export const searchAudience = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const searchParams = req.body;
		const result = await LineService.searchAudience(searchParams);
		res.send(result);
	} catch (e) {
		next(e);
	}
};

export const searchEventAudience = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await LineService.searchEventAudienceHandler(req.body);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const searchCampaignAudience = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const searchParams = req.body;
		const result = await LineService.searchCampaignAudience(searchParams);
		res.send(result);
	} catch (e) {
		next(e);
	}
};

export const createAudience = async (req: Request, res: Response, next: NextFunction) => {
	try {
		await LineService.createAudienceHandler(req.body);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
export const createCampaignAudience = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.body.audienceName) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}
		await LineService.createCampaignAudience(req.body);
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
export const createSurveyAudience = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.body.name) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}
		const response = await LineService.createSurveyAudience(req.body);
		res.status(200).json(response);
	} catch (e) {
		next(e);
	}
};

export const deleteAudience = async (req: Request, res: Response, next: NextFunction) => {
	const audienceGroupId = req.params.audienceGroupId;
	try {
		if (audienceGroupId == null) {
			throw new Error('invalid audienceGroupId');
		} else {
			await LineService.deleteAudience(audienceGroupId);
			SocketServerService.emitAudience({ audienceGroupId });
			res.sendStatus(RESPONSE_SUCCESS);
		}
	} catch (e) {
		next(e);
	}
};

export const browseAudienceSurveys = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const audiences = await LineService.listAudiences('survey');
		res.send(audiences);
	} catch (e) {
		next(e);
	}
};

export const searchAudienceSurvey = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const result = await audiencesService.searchAudienceSurvey(
			req.query as unknown as Parameters<typeof audiencesService.searchAudienceSurvey>[0],
		);
		res.status(200).json(result);
	} catch (error) {
		next(error);
	}
};

export const browseAudienceSurveyOptions = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const surveys = await audiencesService.browseAudienceSurveyOptions();
		res.status(200).json(surveys);
	} catch (e) {
		next(e);
	}
};

export const browseAudienceSurveyQuestions = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const questions = await audiencesService.browseAudienceSurveyQuestions(
			req.query as unknown as Parameters<typeof audiencesService.browseAudienceSurveyQuestions>[0],
		);
		res.status(200).json(questions);
	} catch (e) {
		next(e);
	}
};

export const browseAudienceLotteries = async (_req: Request, res: Response, next: NextFunction) => {
	try {
		const lotteries = await audiencesService.browseAudienceLotteries();
		res.status(200).json(lotteries);
	} catch (e) {
		next(e);
	}
};

export const browseAudienceLotteryPrizes = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const prizes = await audiencesService.browseAudienceLotteryPrizes(
			req.params as unknown as Parameters<typeof audiencesService.browseAudienceLotteryPrizes>[0],
		);
		res.status(200).json(prizes);
	} catch (e) {
		next(e);
	}
};

export const browseAudienceLotteryDraws = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const winners = await audiencesService.browseAudienceLotteryDraws({
			...req.params,
			...req.query,
		} as unknown as Parameters<typeof audiencesService.browseAudienceLotteryDraws>[0]);
		res.status(200).json(winners);
	} catch (e) {
		next(e);
	}
};

export const createAudienceLottery = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const lottery = await audiencesService.createAudienceLottery(req.body);
		res.status(201).json(lottery);
	} catch (e) {
		next(e);
	}
};

export const browseAudienceMembers = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const members = await audiencesService.browseAudienceMembersHandler({
			...req.query,
		});
		res.status(RESPONSE_SUCCESS).json(members);
	} catch (error) {
		next(error);
	}
};

export const createAudienceMember = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const audienceCreated = await LineService.createAudienceMemberHandler(req.body);

		SocketServerService.emitAudienceCreated(audienceCreated as unknown as Audience);

		res.status(CREATED).json(audienceCreated);
	} catch (error) {
		next(error);
	}
};
