import { Migration } from 'sequelize-cli';
import { AUDIENCE_TYPE, DATABASE_TABLE_NAME } from '~config';
import { writeLog } from '~utilities';

module.exports = {
	up: async (queryInterface) => {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.sequelize.query(
				`
					ALTER TABLE
						${DATABASE_TABLE_NAME.AUDIENCES}
					MODIFY
						COLUMN type ENUM(
							'${AUDIENCE_TYPE.DEFAULT}',
							'${AUDIENCE_TYPE.CAMPAIGN}',
							'${AUDIENCE_TYPE.SURVEY}',
							'${AUDIENCE_TYPE.LOTTERY}',
							'${AUDIENCE_TYPE.MEMBER}'
						);
				`,
				{
					transaction,
				},
			);

			await transaction.commit();
		} catch (error) {
			writeLog(`🚀 ~ file: 20240828081143-update-type-audiences.ts:43 ~ up: ~ error: ${error}`, 'info');
			await transaction.rollback();
		}
	},

	down: async (queryInterface) => {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.sequelize.query(
				`
					ALTER TABLE
						${DATABASE_TABLE_NAME.AUDIENCES}
					MODIFY
						COLUMN type ENUM(
							'${AUDIENCE_TYPE.DEFAULT}',
							'${AUDIENCE_TYPE.CAMPAIGN}',
							'${AUDIENCE_TYPE.SURVEY}',
							'${AUDIENCE_TYPE.LOTTERY}'
						);
				`,
				{
					transaction,
				},
			);

			await transaction.commit();
		} catch (error) {
			writeLog(`🚀 ~ file: 20240828081143-update-type-audiences.ts:58 ~ down: ~ error: ${error}`, 'info');
			await transaction.rollback();
		}
	},
} satisfies Migration;
