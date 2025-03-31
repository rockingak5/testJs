import { Transaction } from 'sequelize';
import { db } from '../models';

export const upsertFriendAddedDate = async (lineId: string, addedDate: Date | null) => {
	let friendAddedDate = await db.memberFriendAddedModel.findOne({
		where: { lineId: lineId },
	});

	if (friendAddedDate) {
		friendAddedDate.addedDate = addedDate;
		await friendAddedDate.save();
	} else {
		friendAddedDate = await db.memberFriendAddedModel.create({
			lineId,
			addedDate,
		});
	}
	return friendAddedDate;
};

export const getMemberFriendAddedDateByLineId = async (lineId: string, transaction?: Transaction) => {
	return db.memberFriendAddedModel.findOne({
		where: {
			lineId,
		},
		transaction,
	});
};
