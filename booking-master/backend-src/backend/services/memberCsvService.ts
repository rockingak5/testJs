import { Transaction, WhereAttributeHash } from 'sequelize';

import { db } from '../models';

export const getMemberDataList = async (
	memberWhere: WhereAttributeHash,
	includeAQ = false,
	transaction?: Transaction,
	customerRegistrationIds?: string[],
) =>
	db.members.findAll({
		where: memberWhere,
		attributes: {
			exclude: ['lineId', 'createdAt', 'updatedAt'],
			include: [...(customerRegistrationIds || [])],
		},
		include: {
			separate: true,
			association: db.members.associations.campaignAnswers,
			attributes: ['campaignQuestionId', 'contents'],
			include: includeAQ ? [{ association: db.campaignAnswers.associations.CampaignQuestion }] : [],
		},
		order: [
			//
			['memberId', 'desc'],
		],
		transaction,
	});
