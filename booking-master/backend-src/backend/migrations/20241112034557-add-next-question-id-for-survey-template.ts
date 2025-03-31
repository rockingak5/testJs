import { QueryInterface, DataTypes } from 'sequelize';
import { DATABASE_TABLE_NAME } from '~config';

module.exports = {
	up: async (queryInterface: QueryInterface) => {
		try {
			const tableInfo = await queryInterface.describeTable(DATABASE_TABLE_NAME.SURVEY_TEMPLATE);
			if (!tableInfo.managerId) {
				await queryInterface.addColumn(DATABASE_TABLE_NAME.SURVEY_TEMPLATE, 'nextQuestionId', {
					type: DataTypes.INTEGER,
					allowNull: true,
				});
			}
		} catch (error) {
			console.error('20241112034557-add-next-question-id-for-survey-template error', error);
		}
	},

	down: async (queryInterface: QueryInterface) => {
		try {
			const tableInfo = await queryInterface.describeTable(DATABASE_TABLE_NAME.SURVEY_TEMPLATE);
			if (tableInfo.managerId) {
				await queryInterface.removeColumn(DATABASE_TABLE_NAME.SURVEY_TEMPLATE, 'nextQuestionId');
			}
		} catch (error) {
			console.error('20241112034557-add-next-question-id-for-survey-template down error', error);
		}
	},
};
