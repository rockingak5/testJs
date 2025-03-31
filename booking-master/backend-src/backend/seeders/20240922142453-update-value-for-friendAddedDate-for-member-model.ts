import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			const members = await queryInterface.sequelize.query(
				`SELECT memberId, createdAt, lineId FROM \`${DATABASE_TABLE_NAME.MEMBERS}\` WHERE friendAddedDate IS NULL`,
			);

			for (const member of members[0] as { memberId: number; createdAt: Date; lineId: string }[]) {
				if (member?.lineId) {
					const addedDate = member.createdAt;
					await queryInterface.bulkUpdate(
						DATABASE_TABLE_NAME.MEMBERS,
						{
							friendAddedDate: addedDate,
						},
						{ memberId: member.memberId },
					);
					await queryInterface.bulkInsert(
						DATABASE_TABLE_NAME.MEMBER_FRIEND_ADDED,
						[
							{
								lineId: member.lineId,
								addedDate,
							},
						],
						{
							transaction,
						},
					);
				}
			}

			await transaction.commit();
		} catch (err) {
			console.error('20240917063838-migrate-friend-added-date-for-members', err);
			await transaction.rollback();
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	async down(queryInterface, Sequelize) {
		await queryInterface.bulkUpdate(
			DATABASE_TABLE_NAME.MEMBERS,
			{
				friendAddedDate: null,
			},
			{},
		);
	},
} satisfies Migration;
