import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME, SURVEY_NAVIGATION_TYPE } from '~config';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.bulkUpdate(
				DATABASE_TABLE_NAME.SURVEY_TEMPLATE,
				{
					navigationType: SURVEY_NAVIGATION_TYPE.NEXT_QUESTION,
				},
				{},
			);

			await transaction.commit();
		} catch (err) {
			console.error('20240828083626-migration-data-navigation-type-and-next-survey-template-for-template-survey', err);
			await transaction.rollback();
		}
	},

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	async down(queryInterface, Sequelize) {},
} satisfies Migration;
