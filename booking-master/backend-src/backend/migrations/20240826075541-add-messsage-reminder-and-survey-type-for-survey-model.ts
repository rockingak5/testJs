import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME, SURVEY_PAGE_TYPE } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.SURVEYS,
				'messageReminder',
				{
					type: Sequelize.DataTypes.STRING(1000),
					allowNull: true,
					defaultValue: null,
				},
				{ transaction },
			);

			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.SURVEYS,
				'pageType',
				{
					type: Sequelize.DataTypes.ENUM(...Object.values(SURVEY_PAGE_TYPE)),
					allowNull: false,
					defaultValue: SURVEY_PAGE_TYPE.SINGLE_PAGE,
				},
				{ transaction },
			);

			await transaction.commit();
		} catch (error) {
			console.log('20240826075541-add-messsage-reminder-and-survey-type-for-survey-model', error);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.removeColumn(DATABASE_TABLE_NAME.SURVEYS, 'messageReminder');
			await queryInterface.removeColumn(DATABASE_TABLE_NAME.SURVEYS, 'pageType');
			await transaction.commit();
		} catch (error) {
			console.log('20240826075541-add-messsage-reminder-and-survey-type-for-survey-model', error);
			await transaction.rollback();
		}
	},
} as Migration;
