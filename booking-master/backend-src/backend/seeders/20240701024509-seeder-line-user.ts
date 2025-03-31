import { Migration } from 'sequelize-cli';
import { chunk } from 'lodash';

import { systemConfig } from '../config';
import { getFollowerIds, getProfile } from '../services/lineService';
import { db } from '../models';

module.exports = {
	async up(queryInterface) {
		const transaction = await queryInterface.sequelize.transaction();

		if (systemConfig.NODE_ENV !== 'production') {
			return Promise.resolve();
		}

		try {
			const followerIds = await getFollowerIds();

			// Rate limit 2,000 requests per second
			const followerIdsChunked = chunk(followerIds, 2000);

			let lineProfiles: any[] = [];

			for (const followerIds of followerIdsChunked) {
				const profiles = await Promise.all(followerIds.map((id) => getProfile(id)));
				lineProfiles = [...lineProfiles, ...profiles];
			}

			const bulkCreateData = lineProfiles.filter(Boolean).map((cLine) => ({
				displayName: cLine.displayName,
				lineId: cLine.userId,
				picUrl: cLine.pictureUrl,
				isFriends: true,
				curRM: 'defaultRM',
				via: 'others',
				origin: 'system',
			}));

			await db.members.bulkCreate(bulkCreateData as any[], {
				transaction,
			});
			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
		}
	},

	async down(queryInterface) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await db.members.destroy({ transaction });
			transaction.commit();
		} catch (error) {
			transaction.rollback();
		}
	},
} satisfies Migration;
