import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.SURVEYS,
				'totalRespondents',
				{
					type: Sequelize.DataTypes.INTEGER,
					defaultValue: 0,
				},
				{ transaction },
			);

			await transaction.commit();
		} catch (error) {
			console.log('20240827014359-add-field-total-respondents-for-survey', error);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.removeColumn(DATABASE_TABLE_NAME.SURVEYS, 'totalRespondents');
			await transaction.commit();
		} catch (error) {
			console.log('20240827014359-add-field-total-respondents-for-survey', error);
			await transaction.rollback();
		}
	},
} as Migration;
