import { Migration } from 'sequelize-cli';
import { CUSTOMER_REGISTRATION_FIELD_TYPE, DATABASE_TABLE_NAME } from '~config';
import { get } from 'lodash';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.bulkUpdate(
				DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				{
					showOrder: Sequelize.literal('showOrder + 1'),
				},
				{
					showOrder: { [Sequelize.Op.gte]: 4 },
				},
				{ transaction },
			);

			const registrationCreatedId = await queryInterface.bulkInsert(
				DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				[
					{
						isDelete: false,
						required: true,
						isDisplayed: true,
						label: '市区町村以降の住所',
						type: CUSTOMER_REGISTRATION_FIELD_TYPE.TEXT,
						showOrder: 4,
					},
				],
				{
					transaction,
				},
			);

			await queryInterface.addColumn(
				DATABASE_TABLE_NAME.MEMBERS,
				`customerRegistrationId${registrationCreatedId}`,
				{
					type: Sequelize.DataTypes.STRING,
					defaultValue: null,
					allowNull: true,
				},
				{
					transaction,
				},
			);

			await transaction.commit();
		} catch (error) {
			console.log('🚀 -------------------------------------------------------------------------------------🚀');
			console.log('🚀 ~ file: 20240812045048-seed-city-town-village-addresses.ts:41 ~ up ~ error:', error);
			console.log('🚀 -------------------------------------------------------------------------------------🚀');
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			const [[field]] = await queryInterface.sequelize.query(
				`SELECT * FROM ${DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS} WHERE label = :label AND showOrder = 4`,
				{
					replacements: { table: DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS, label: '市区町村以降の住所' },
				},
			);

			await queryInterface.bulkDelete(
				DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				{
					label: '市区町村以降の住所',
					showOrder: 4,
				},
				{
					transaction,
				},
			);

			await queryInterface.bulkUpdate(
				DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS,
				{
					showOrder: Sequelize.literal('showOrder - 1'),
				},
				{
					showOrder: { [Sequelize.Op.gte]: 5 },
				},
				{ transaction },
			);

			if (get(field, 'customerRegistrationId')) {
				await queryInterface.removeColumn(
					DATABASE_TABLE_NAME.MEMBERS,
					`customerRegistrationId${get(field, 'customerRegistrationId')}`,
				);
			}

			await transaction.commit();
		} catch (error) {
			console.log('🚀 ---------------------------------------------------------------------------------------🚀');
			console.log('🚀 ~ file: 20240812045048-seed-city-town-village-addresses.ts:75 ~ down ~ error:', error);
			console.log('🚀 ---------------------------------------------------------------------------------------🚀');
			await transaction.rollback();
		}
	},
} satisfies Migration;
