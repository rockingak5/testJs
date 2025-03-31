import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME, CUSTOMER_REGISTRATIONS_DEFAULT_FIELD } from '~config';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				'name',
				{
					type: Sequelize.DataTypes.STRING,
					allowNull: true,
					defaultValue: null,
				},
				{ transaction },
			);

			await queryInterface.sequelize.query(
				`
        UPDATE \`${DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS}\`
        SET name = CASE
                    WHEN label = '名前（苗字）' THEN '${CUSTOMER_REGISTRATIONS_DEFAULT_FIELD.LAST_NAME}'
                    WHEN label = '名前（名前）' THEN '${CUSTOMER_REGISTRATIONS_DEFAULT_FIELD.FIRST_NAME}'
                    WHEN label = '郵便番号' THEN '${CUSTOMER_REGISTRATIONS_DEFAULT_FIELD.POSTAL_CODE}'
                    WHEN label = '住所' THEN '${CUSTOMER_REGISTRATIONS_DEFAULT_FIELD.ADDRESS}'
                    WHEN label = '市区町村以降の住所' THEN '${CUSTOMER_REGISTRATIONS_DEFAULT_FIELD.SUB_ADDRESS}'
                    WHEN label = '建物名・お部屋番号（無い場合は「無し」）' THEN '${CUSTOMER_REGISTRATIONS_DEFAULT_FIELD.BUILDING}'
                    WHEN label = 'お電話番号' THEN '${CUSTOMER_REGISTRATIONS_DEFAULT_FIELD.TELEPHONE}'
                   END
        WHERE label IN (
          '名前（苗字）',
          '名前（名前）',
          '郵便番号',
          '住所',
          '市区町村以降の住所',
					'建物名・お部屋番号（無い場合は「無し」）'
        );
      `,
				{
					type: Sequelize.QueryTypes.BULKUPDATE,
					transaction,
				},
			);

			await transaction.commit();
		} catch (error) {
			console.log(
				'🚀 ~ file: 20240813105249-add-column-default-name-customer-registrations.ts:46 ~ up ~ error:',
				error,
			);
			await transaction.rollback();
		}
	},

	async down(queryInterface) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.removeColumn(DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS, 'name', { transaction });
			await transaction.commit();
		} catch (error) {
			console.log(
				'🚀 ~ file: 20240813105249-add-column-default-name-customer-registrations.ts:58 ~ down ~ error:',
				error,
			);
			await transaction.rollback();
		}
	},
} satisfies Migration;
