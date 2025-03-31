import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.SURVEYS,
				'surveyImage',
				{
					type: Sequelize.DataTypes.STRING,
					allowNull: true,
					defaultValue: null,
				},
				{ transaction },
			);

			await transaction.commit();
		} catch (error) {
			console.log('20240808183925-add-column-surveyImage', error);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.removeColumn(DATABASE_TABLE_NAME.SURVEYS, 'surveyImage');
			await transaction.commit();
		} catch (error) {
			console.log('20240808183925-add-column-surveyImage', error);
			await transaction.rollback();
		}
	},
} as Migration;
