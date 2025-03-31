import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.bulkUpdate(
				DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				{
					isAdminDisplayed: true,
				},
				{},
			);

			await transaction.commit();
		} catch (err) {
			console.error('20240906041157-migrate-field-isDisplayAdmin-for-customer-registration', err);
			await transaction.rollback();
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	async down(queryInterface, Sequelize) {},
} satisfies Migration;
