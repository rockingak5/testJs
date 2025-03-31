import { Migration } from 'sequelize-cli';
import { Surveys } from '~models/surveyModel';
import { uniq } from 'lodash';
import { SurveyRecord } from '~models/surveyRecordModel';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			const surveys: Surveys[] = await queryInterface.sequelize.query('SELECT * FROM Surveys', {
				type: Sequelize.QueryTypes.SELECT,
			});

			for (const survey of surveys) {
				const sqlSurveyRecords = `
						SELECT
							lineUserId
						FROM
							SurveyRecords
						WHERE
							surveyId = :surveyId
					`;
				const replaceMentsSurveyRecords = { surveyId: survey.surveyId };

				const surveyRecords: SurveyRecord[] = await queryInterface.sequelize.query(sqlSurveyRecords, {
					replacements: replaceMentsSurveyRecords,
					type: Sequelize.QueryTypes.SELECT,
				});
				const lineIds = surveyRecords.map((it) => it.lineUserId) || [];
				const totalRespondents = uniq(lineIds).length;
				await queryInterface.bulkUpdate(
					'Surveys',
					{
						totalRespondents,
					},
					{
						surveyId: survey.surveyId,
					},
				);
			}

			await transaction.commit();
		} catch (err) {
			console.error('20240827031727-migrate-totalRespondents', err);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			const surveys: Surveys[] = await queryInterface.sequelize.query('SELECT * FROM Surveys', {
				type: Sequelize.QueryTypes.SELECT,
			});

			for (const survey of surveys) {
				await queryInterface.bulkUpdate(
					'Surveys',
					{
						totalRespondents: 0,
					},
					{
						surveyId: survey.surveyId,
					},
				);
			}

			await transaction.commit();
		} catch (err) {
			console.error('20240827031727-migrate-totalRespondents', err);
			await transaction.rollback();
		}
	},
} satisfies Migration;
