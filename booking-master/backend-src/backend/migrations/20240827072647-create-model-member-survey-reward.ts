import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.createTable(DATABASE_TABLE_NAME.MEMBER_SURVEY_REWARD, {
				memberSurveyRewardId: {
					type: Sequelize.DataTypes.INTEGER({ unsigned: true }),
					autoIncrement: true,
					primaryKey: true,
				},
				memberId: {
					type: Sequelize.DataTypes.INTEGER({ unsigned: true }),
					references: {
						key: 'memberId',
						model: DATABASE_TABLE_NAME.MEMBERS,
					},
					onDelete: 'CASCADE',
				},
				surveyId: {
					type: Sequelize.DataTypes.INTEGER,
					references: {
						key: 'surveyId',
						model: DATABASE_TABLE_NAME.SURVEYS,
					},
					onDelete: 'CASCADE',
				},
				surveyRewardCode: { type: Sequelize.DataTypes.STRING, allowNull: false },
				createdAt: {
					allowNull: false,
					type: Sequelize.DATE,
					defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
				},
				updatedAt: {
					allowNull: false,
					type: Sequelize.DATE,
					defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
				},
			});

			await transaction.commit();
		} catch (error) {
			console.log('20240827072647-create-model-member-survey-reward', error);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.sequelize.query(`DROP TABLE IF EXISTS \`${DATABASE_TABLE_NAME.MEMBER_SURVEY_REWARD}\``, {
				type: Sequelize.QueryTypes.DELETE,
				transaction,
			});
			await transaction.commit();
		} catch (error) {
			console.log('20240827072647-create-model-member-survey-reward', error);
			await transaction.rollback();
		}
	},
} as Migration;
