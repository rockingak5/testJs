import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';
import { DataTypes } from 'sequelize';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.SURVEY_TEMPLATE,
				'questionImage',
				{ type: DataTypes.STRING, allowNull: true, defaultValue: null },
				{},
			);

			await transaction.commit();
		} catch (err) {
			console.error('20241013144905-update-question-image-for-survey-template', err);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn(DATABASE_TABLE_NAME.SURVEY_TEMPLATE, 'questionImage', {});
	},
} satisfies Migration;
