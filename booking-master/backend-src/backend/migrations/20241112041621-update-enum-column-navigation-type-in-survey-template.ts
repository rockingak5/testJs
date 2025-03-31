import { QueryInterface, DataTypes } from 'sequelize';
import { DATABASE_TABLE_NAME, SURVEY_NAVIGATION_TYPE } from '~config';

module.exports = {
	up: async (queryInterface: QueryInterface) => {
		try {
			await queryInterface.changeColumn(DATABASE_TABLE_NAME.SURVEY_TEMPLATE, 'navigationType', {
				type: DataTypes.ENUM(...Object.values(SURVEY_NAVIGATION_TYPE)),
				allowNull: false,
			});
		} catch (err) {
			console.log('20241112041621-update-enum-column-navigation-type-in-survey-template error', err);
		}
	},

	down: async (queryInterface: QueryInterface) => {
		try {
			await queryInterface.changeColumn(DATABASE_TABLE_NAME.SURVEY_TEMPLATE, 'navigationType', {
				type: DataTypes.ENUM(...Object.values(SURVEY_NAVIGATION_TYPE).slice(0, -1)),
				allowNull: false,
			});
		} catch (err) {
			console.log('20241112041621-update-enum-column-navigation-type-in-survey-template error', err);
		}
	},
};
