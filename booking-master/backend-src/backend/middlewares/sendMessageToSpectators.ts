import type { NextFunction, Request, Response } from 'express';
import { get } from 'lodash';
import { Sequelize } from 'sequelize';

import { sendMulticastMessage } from '../services/lineService';
import { db } from '../models';
import { Member } from '../models/memberModel';

const replace = (template: string, replacements: Record<string, any>) => {
	return template.replace(/\[(.*?)\]/g, (match, key) => {
		return typeof replacements[key] !== 'undefined' ? replacements[key] : match;
	});
};

export const sendMessageToSpectators = async (req: Request, res: Response, next: NextFunction) => {
	const member = get(res.locals, 'memberLine') as unknown as Member;
	const name = get(member, 'customerRegistrationId1', '');
	const tel = get(member, 'customerRegistrationId2', '');

	const setting = await db.systemSettings.findOne({
		where: {
			name: 'watchMemberTemplate',
		},
		attributes: ['valueString'],
		raw: true,
	});

	const spectators = (await db.spectators.findAll({
		where: {
			isSpectatingMember: true,
		},
		include: [
			{
				model: db.members,
				attributes: [],
			},
		],
		raw: true,
		attributes: [[Sequelize.col('Member.lineId'), 'id']],
	})) as unknown as { id: string }[];

	if (spectators.length && setting && setting.valueString) {
		const message = setting.valueString;
		await sendMulticastMessage(
			spectators.map((spectator) => spectator.id),
			replace(message, { NAME: name, TEL: tel }),
		);
	}

	next();
};
