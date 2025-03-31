import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.MEMBERS,
				'friendAddedDate',
				{
					type: Sequelize.DATE,
					allowNull: true,
					defaultValue: null,
				},
				{},
			);

			await transaction.commit();
		} catch (err) {
			console.error('20240915160545-update-date-add-friend-for-member', err);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn(DATABASE_TABLE_NAME.MEMBERS, 'friendAddedDate', {});
	},
} satisfies Migration;
