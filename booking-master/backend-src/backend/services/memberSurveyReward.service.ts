import { CreationAttributes, Op, Transaction } from 'sequelize';
import { db } from '../models';
import { MemberSurveyReward } from '~models/memberSurveyRewardModel';

export const createMemberSurveyReward = async (
	data: CreationAttributes<MemberSurveyReward>,
	transaction?: Transaction,
) => db.memberSurveyRewardModel.create(data, { transaction });

export const getMemberSurveyRewardBySurveyId = async (
	surveyId: number,
	memberIds: number[],
	transaction?: Transaction,
) => {
	return db.memberSurveyRewardModel.findAll({
		where: {
			memberId: { [Op.in]: memberIds },
			surveyId,
		},
		transaction,
	});
};
