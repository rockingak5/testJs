import { NextFunction, Request, Response } from 'express';
import moment from 'moment';
import { Op, WhereAttributeHash } from 'sequelize';

import { SYSTEM_ERROR } from '../config';
import { CampaignService } from '../services';
import { AppError } from '../utilities';

// export const generateCandidates = async (req: Request, res: Response, next: NextFunction) => {
// 	try {
// 		const { from, to, hasWon, candidateAtMin, candidateAtMax, memberId, telephone, address, email, name } =
// 			req.query as Record<string, string | boolean | undefined>;
// 		if (from && !moment(from as string).isValid()) {
// 			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
// 		}
// 		if (to && !moment(to as string).isValid()) {
// 			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
// 		}

// 		const memberWhere = MemberCsvService.generateMemberSearchFilter(
// 			{
// 				candidateAt: { [Op.is]: null },
// 				isCampaign: true,
// 				isRegistered: true,
// 			},
// 			{
// 				hasWon,
// 				candidateAtMin,
// 				candidateAtMax,
// 				memberSinceMin: from,
// 				memberSinceMax: to,
// 				memberId,
// 				telephone,
// 				address,
// 				email,
// 				name,
// 			},
// 		);

// 		const candidates = await CampaignService.selectCandidates(memberWhere);
// 		res.send(candidates);
// 	} catch (e) {
// 		next(e);
// 	}
// };

export const generateWinners = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const memberIds = req.body.memberIds;
		let winnersCount = req.body.winnersCount;
		winnersCount = parseInt(winnersCount);
		if (isNaN(winnersCount)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}
		if (!(Array.isArray(memberIds) && memberIds.length > 0)) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}
		const timestamp = moment();
		const candidates = await CampaignService.selectWinners(memberIds, winnersCount, timestamp.toDate());
		res.send(candidates);
	} catch (e) {
		next(e);
	}
};

export const resetWinners = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const memberWhere: WhereAttributeHash = {};
		const { from, to, isConfirmed } = req.body;
		if (from && to) {
			memberWhere.candidateAt = { [Op.between]: [from, to] };
		} else if (from) {
			memberWhere.candidateAt = { [Op.gte]: from };
		} else if (to) {
			memberWhere.candidateAt = { [Op.lte]: to };
		} else {
			memberWhere.candidateAt = { [Op.not]: null };
		}
		const count = isConfirmed
			? await CampaignService.resetWinners(memberWhere)
			: await CampaignService.countWinners(memberWhere);
		res.send({ count });
	} catch (e) {
		next(e);
	}
};

// export const generateCandidatesCSV = async (req: Request, res: Response, next: NextFunction) => {
// 	try {
// 		const managerId = req.session.user?.id;
// 		if (!managerId) {
// 			throw new AppError(PERMISSION_ERROR, 'no session', false);
// 		}
// 		const {
// 			memberIds,
// 			isAllWinners,
// 			hasWon,
// 			candidateAtMin,
// 			candidateAtMax,
// 			memberSinceMin,
// 			memberSinceMax,
// 			telephone,
// 			address,
// 			email,
// 			name,
// 			password,
// 		} = req.body;
// 		if (isAllWinners == undefined || (!password && !Array.isArray(memberIds))) {
// 			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
// 		}
// 		if ((isAllWinners === true || isAllWinners === 'true') && password) {
// 			const manager = await ManagerService.getManager(managerId);
// 			if (manager == null) {
// 				throw new AppError(SYSTEM_ERROR, `manager ${managerId} does not exist`, false);
// 			}
// 			const isMatch = await comparePassword(password, manager.pwhash);
// 			if (!isMatch) {
// 				throw new AppError(PERMISSION_ERROR, 'invalid password', false);
// 			}
// 		} else if (isAllWinners === false && !(memberIds && memberIds.length > 0)) {
// 			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
// 		}

// 		const memberWhere = MemberCsvService.generateMemberSearchFilter(
// 			{
// 				candidateAt: { [Op.not]: null },
// 				isCampaign: true,
// 				isRegistered: true,
// 			},
// 			{
// 				memberIds,
// 				hasWon,
// 				candidateAtMin,
// 				candidateAtMax,
// 				memberSinceMin,
// 				memberSinceMax,
// 				telephone,
// 				address,
// 				email,
// 				name,
// 			},
// 		);

// 		const csvData = await MemberCsvService.getMemberCsvData(memberWhere);
// 		res.setHeader('Content-Type', 'text/csv');
// 		res.setHeader('Content-Disposition', 'attachment; filename=campaign_candidates.csv');
// 		res.status(RESPONSE_SUCCESS).end(csvData);
// 	} catch (e) {
// 		next(e);
// 	}
// };
