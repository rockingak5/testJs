import { CreationAttributes, Op, Transaction, WhereAttributeHash } from 'sequelize';
import { db } from '../models';
import { Spectator } from '../models/spectatorModel';

export const listSpectatorsByWatch = async (
	watch: 'campaign' | 'member' | 'registration',
	transaction?: Transaction,
) => {
	let spectatorWhere: WhereAttributeHash | null = null;
	switch (watch) {
		case 'campaign':
			spectatorWhere = { isSpectatingCampaign: true };
			break;
		case 'member':
			spectatorWhere = { isSpectatingMember: true };
			break;
		case 'registration':
			spectatorWhere = { isSpectatingRegistration: true };
			break;
		default:
			break;
	}
	if (spectatorWhere != null) {
		return await db.spectators.findAll({
			where: spectatorWhere,
			attributes: ['memberId'],
			include: {
				association: db.spectators.associations.Member,
				attributes: ['lineId'],
			},
			transaction,
		});
	} else {
		return [];
	}
};

export const listSpectatorCandidates = async (transaction?: Transaction) => {
	const existingSpectators = await db.spectators.findAll({
		attributes: ['spectatorId', 'memberId'],
		transaction,
	});
	let spectators = [];
	if (existingSpectators.length == 0) {
		spectators = await db.members.findAll({
			where: { lineId: { [Op.not]: null }, isFriends: true },
			attributes: ['memberId', 'displayName', 'picUrl'],
			transaction,
		});
	} else {
		spectators = await db.members.findAll({
			where: {
				memberId: { [Op.notIn]: existingSpectators.map((s) => s.memberId) },
				lineId: { [Op.not]: null },
				isFriends: true,
			},
			attributes: ['memberId', 'displayName', 'picUrl'],
			transaction,
		});
	}
	return spectators;
};

export const listSpectators = async (transaction?: Transaction) =>
	db.spectators.findAll({
		attributes: { exclude: ['createdAt', 'updatedAt'] },
		include: {
			association: db.spectators.associations.Member,
			attributes: [
				'memberId',
				'memberCode',
				'displayName',
				'picUrl',
				'firstName',
				'lastName',
				'firstNameKana',
				'lastNameKana',
				'email',
				'telephone',
				'memberInfo',
				'customerRegistrationId1',
			],
		},
		transaction,
	});

export const bulkEditSpectators = async (members: CreationAttributes<Spectator>[], transaction?: Transaction) => {
	const membersDB = await db.members.findAll({
		attributes: ['memberId'],
		where: {
			memberId: { [Op.in]: members.map((m) => m.memberId as number) },
			isFriends: true,
		},
		transaction,
	});
	if (membersDB.length > 0) {
		members = members.filter((m) => membersDB.some((mDB) => m.memberId == mDB.memberId));
		return await db.spectators.bulkCreate(members, {
			fields: ['memberId', 'isSpectatingMember', 'isSpectatingCampaign', 'isSpectatingRegistration'],
			updateOnDuplicate: ['isSpectatingMember', 'isSpectatingCampaign', 'isSpectatingRegistration'],
			transaction,
		});
	} else {
		return [];
	}
};

export const deleteSpectator = async (spectatorId: number, transaction?: Transaction) =>
	db.spectators.destroy({ where: { spectatorId }, transaction });
