import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME, SYSTEM_SETTING_KEYS } from '../config';

module.exports = {
	async up(queryInterface) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.bulkInsert(
				DATABASE_TABLE_NAME.SYSTEM_SETTINGS,
				[
					{
						name: SYSTEM_SETTING_KEYS.IS_EVENT_BOOKING_TAB_VISIBLE,
						label: '会員証メニュー',
						valueFlag: false,
						valueString: null,
						valueNumber: null,
						isPublic: true,
					},
				],
				{
					transaction,
				},
			);
			await transaction.commit();
		} catch (error) {
			console.log('🚀 -------------------------------------------------------------------------------------🚀');
			console.log('🚀 ~ file: 20240726025154-system-setting-line-category-tab.ts:28 ~ up ~ error:', error);
			console.log('🚀 -------------------------------------------------------------------------------------🚀');

			await transaction.rollback();
		}
	},

	async down(queryInterface) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.bulkDelete(
				DATABASE_TABLE_NAME.SYSTEM_SETTINGS,
				{
					name: SYSTEM_SETTING_KEYS.IS_EVENT_BOOKING_TAB_VISIBLE,
				},
				{
					transaction,
				},
			);
			await transaction.commit();
		} catch (error) {
			console.log('🚀 ---------------------------------------------------------------------------------------🚀');
			console.log('🚀 ~ file: 20240726025154-system-setting-line-category-tab.ts:51 ~ down ~ error:', error);
			console.log('🚀 ---------------------------------------------------------------------------------------🚀');

			await transaction.rollback();
		}
	},
} satisfies Migration;
