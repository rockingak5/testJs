import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME, RICH_MENU_TYPES } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.sequelize.query('DROP TABLE IF EXISTS `RichMenuActions`', {
				transaction,
			});
			await queryInterface.sequelize.query(`DROP TABLE IF EXISTS \`${DATABASE_TABLE_NAME.RICH_MENU}\``, {
				transaction,
			});

			await queryInterface.createTable(DATABASE_TABLE_NAME.RICH_MENU, {
				id: { type: Sequelize.DataTypes.INTEGER({ unsigned: true }), autoIncrement: true, primaryKey: true },
				richMenuId: { type: Sequelize.DataTypes.STRING(64), unique: true, allowNull: true, defaultValue: null },
				areas: { type: Sequelize.DataTypes.JSON, allowNull: false },
				name: { type: Sequelize.DataTypes.STRING, allowNull: false },
				picUrl: { type: Sequelize.DataTypes.STRING(150), allowNull: false },
				type: { type: Sequelize.DataTypes.ENUM, values: RICH_MENU_TYPES, allowNull: false },
				isDisplayed: { type: Sequelize.DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				template: { type: Sequelize.DataTypes.STRING(100), allowNull: true, defaultValue: null },
				width: { type: Sequelize.DataTypes.INTEGER({ unsigned: true }), allowNull: false },
				height: { type: Sequelize.DataTypes.INTEGER({ unsigned: true }), allowNull: false },
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
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.sequelize.query(`DROP TABLE IF EXISTS \`${DATABASE_TABLE_NAME.RICH_MENU}\``, {
				type: Sequelize.QueryTypes.DELETE,
				transaction,
			});
			await transaction.commit();
		} catch (error) {
			await transaction.rollback();
		}
	},
} as Migration;
