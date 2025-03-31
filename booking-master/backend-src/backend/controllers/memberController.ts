import { NextFunction, Request, Response } from 'express';
import { Attributes, Op, QueryTypes } from 'sequelize';

import { CONFLICT_ERROR, PERMISSION_ERROR, RESPONSE_SUCCESS, SORT, SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { Member } from '../models/memberModel';
import { ManagerService, MemberService, SocketServerService } from '../services';
import { AppError, comparePassword } from '../utilities';
import { isSameDay } from '~utilities/commonDateTime';

export const getMember = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const memberId = parseInt(req.params.memberId);
		if (!memberId) {
			throw new AppError(SYSTEM_ERROR, 'invalid memberId', false);
		}
		await MemberService.findMemberById(memberId).then((member) => {
			const { lineId, ...dataMember } = member;
			res.send(dataMember);
		});
	} catch (e) {
		next(e);
	}
};
export const getMemberByBarCode = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const memberCode = req.body.memberCode;
		if (!memberCode) {
			throw new AppError(CONFLICT_ERROR, 'invalid member code');
		}
		const member = await MemberService.findMemberByCode(memberCode);
		if (!member) {
			return res.sendStatus(CONFLICT_ERROR);
		}

		if (req.body.isMemberVisit) {
			const updateData = {
				lastVisit: new Date(),
				countVisit: member.countVisit,
			};
			if (!isSameDay(member.lastVisit)) {
				updateData.countVisit += 1;
			}
			await member.set(updateData).save();
			SocketServerService.emitMember({ memberId: member.memberId });
		}
		return res.send(member);
	} catch (e) {
		next(e);
	}
};

export const generateMemberCSV = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const managerId = req.session.user?.id;

		if (!managerId) {
			throw new AppError(PERMISSION_ERROR, 'no session', false);
		}

		const { password, sort, sortKey, ...filters } = req.body as Record<string, string | undefined> & {
			sort: SORT;
			sortKey: string;
		};

		if (!password) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
		}

		const manager = await ManagerService.getManager(managerId);
		if (manager == null) {
			throw new AppError(SYSTEM_ERROR, `manager ${managerId} does not exist`, false);
		}

		const isMatch = await comparePassword(password, manager.pwhash);

		if (!isMatch) {
			throw new AppError(PERMISSION_ERROR, 'invalid password', false);
		}

		const csvData = await MemberService.getMemberCsvData(
			{
				...filters,
				memberCode: {
					[Op.not]: null,
				},
			},
			{ sort, sortKey } as paginationParams,
		);
		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', 'attachment; filename=campaign_candidates.csv');
		res.status(RESPONSE_SUCCESS).end(csvData);
	} catch (e) {
		next(e);
	}
};
export const browseMembers = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { pp, p, sort, sortKey, ...queries } = req.query;

		const pagination: paginationParams = {
			pp: parseInt(pp as string) || 20,
			p: parseInt(p as string) || 1,
			sort: (sort as string as SORT | null) || SORT.DESCENDING,
			sortKey: (sortKey as string) || 'memberId',
		};

		const { members, count } = await MemberService.browseMembersHandler(queries, pagination);

		res.send({ ...pagination, rows: members ?? [], count });
	} catch (e) {
		next(e);
	}
};
export const listMembers = async (req: Request, res: Response, next: NextFunction) => {
	try {
		await MemberService.listMembers().then((members) => res.send(members));
	} catch (e) {
		next(e);
	}
};
export const updateMember = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const memberId = parseInt(req.params.memberId);
		if (!memberId) {
			throw new AppError(SYSTEM_ERROR, 'invalid memberId', false);
		}
		const params = req.body as Attributes<Member> & { isEditMember?: string };
		const filesRequest = req.files;
		const member = await MemberService.updateMember({ memberId, params, filesRequest });
		SocketServerService.emitMemberUpdated(member);
		return res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};
export const deleteMember = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();

	try {
		const memberId = parseInt(req.params.memberId);

		if (!memberId) {
			throw new AppError(SYSTEM_ERROR, 'invalid memberId', false);
		}

		await db.registrations.destroy({
			force: true,
			where: {
				memberId,
			},
			transaction,
		});

		await MemberService.deleteMember(memberId, transaction);

		const customerRegistrations = await db.customerRegistrations.findAll({
			where: {
				isDisplayed: true,
			},
			include: {
				association: db.customerRegistrations.associations.campaignChoices,
				attributes: { exclude: ['customerRegistrationId', 'campaignQuestionId'] },
			},
			order: [['showOrder', 'asc']],
		});

		const members = await Promise.all(
			customerRegistrations?.map((item) => {
				return db.sequelize.query(
					`SELECT customerRegistrationId${item?.customerRegistrationId} as '${item?.customerRegistrationId}' FROM members WHERE customerRegistrationId${item?.customerRegistrationId} IS NOT NULL LIMIT 1`,
					{
						type: QueryTypes.SELECT,
						plain: true,
						transaction,
					},
				);
			}),
		);

		const arrayIds: Array<number> = [];
		members?.forEach((i) => {
			if (i && typeof i === 'object') {
				arrayIds?.push(Number(Object.keys(i)?.[0]));
			}
		});

		await db.customerRegistrations.update(
			{ isDelete: true },
			{
				where: {
					customerRegistrationId: {
						[Op.notIn]: arrayIds,
					},
				},
				transaction,
			},
		);

		await transaction.commit();

		SocketServerService.emitMemberDeleted({ memberId });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		await transaction.rollback();
		next(e);
	}
};

export const browseSurveyAnswerHistories = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const memberId = parseInt(req.params.memberId);
		const { pp, p, sort, sortKey } = req.query;

		const pagination: paginationParams = {
			pp: parseInt(pp as string) || 20,
			p: parseInt(p as string) || 1,
			sort: (sort as string as SORT | null) || SORT.DESCENDING,
			sortKey: (sortKey as string) || 'surveyId',
		};

		const result = await MemberService.browseSurveyAnswerHistoriesHandler({ memberId, pagination });

		res.status(RESPONSE_SUCCESS).json({
			...result,
			...pagination,
		});
	} catch (error) {
		next(error);
	}
};

export const browseLotteryDrawHistories = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const memberId = parseInt(req.params.memberId);
		const { pp, p, sort, sortKey } = req.query;

		const pagination: paginationParams = {
			pp: parseInt(pp as string) || 20,
			p: parseInt(p as string) || 1,
			sort: (sort as string as SORT | null) || SORT.DESCENDING,
			sortKey: (sortKey as string) || 'surveyId',
		};

		const result = await MemberService.browseLotteryDrawHistoriesHandler({ memberId, pagination });

		res.status(RESPONSE_SUCCESS).json({
			...result,
			...pagination,
		});
	} catch (error) {
		next(error);
	}
};
