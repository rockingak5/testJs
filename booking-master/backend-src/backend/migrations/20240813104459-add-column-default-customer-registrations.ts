import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '~config';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				'isDefault',
				{
					type: Sequelize.DataTypes.BOOLEAN,
					defaultValue: false,
					allowNull: false,
				},
				{ transaction },
			);

			await queryInterface.bulkUpdate(
				DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				{
					isDefault: true,
				},
				{
					label: {
						[Sequelize.Op.in]: [
							'名前（苗字）',
							'名前（名前）',
							'郵便番号',
							'住所',
							'市区町村以降の住所',
							'お電話番号',
							'建物名・お部屋番号（無い場合は「無し」）',
						],
					},
				},
				{
					transaction,
				},
			);
			await transaction.commit();
		} catch (error) {
			console.log('🚀 ~ file: 20240813104459-add-column-default-customer-registrations.ts:36 ~ up ~ error:', error);
			await transaction.rollback();
		}
	},

	async down(queryInterface) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.removeColumn(DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS, 'isDefault');
			await transaction.commit();
		} catch (error) {
			console.log('🚀 ~ file: 20240813104459-add-column-default-customer-registrations.ts:47 ~ down ~ error:', error);
			await transaction.rollback();
		}
	},
} satisfies Migration;
