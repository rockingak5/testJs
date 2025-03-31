import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME, SURVEY_NAVIGATION_TYPE } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.SURVEY_TEMPLATE,
				'navigationType',
				{
					type: Sequelize.DataTypes.ENUM(...Object.values(SURVEY_NAVIGATION_TYPE)),
					allowNull: false,
				},
				{ transaction },
			);

			await transaction.commit();
		} catch (error) {
			console.log('20240828082837-add-navigation-type-and-next-survey-template-for-survey-template', error);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.removeColumn(DATABASE_TABLE_NAME.SURVEY_TEMPLATE, 'navigationType');
			await transaction.commit();
		} catch (error) {
			console.log('20240828082837-add-navigation-type-and-next-survey-template-for-survey-template', error);
			await transaction.rollback();
		}
	},
} as Migration;
