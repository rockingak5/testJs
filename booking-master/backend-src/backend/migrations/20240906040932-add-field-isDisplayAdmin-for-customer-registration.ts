import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn(DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS, 'isAdminDisplayed', {
			type: Sequelize.DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true,
		});
	},

	async down(queryInterface) {
		await queryInterface.removeColumn(DATABASE_TABLE_NAME.CUSTOMER_REGISTRATIONS, 'isAdminDisplayed');
	},
} as Migration;
