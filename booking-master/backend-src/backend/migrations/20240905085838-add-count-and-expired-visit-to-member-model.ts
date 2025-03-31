import { Migration } from 'sequelize-cli';

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('members', 'activeUntil', {
			type: Sequelize.DataTypes.DATEONLY,
			allowNull: true,
		});

		await queryInterface.addColumn('members', 'lastVisit', {
			type: Sequelize.DataTypes.DATE,
			allowNull: true,
		});
		await queryInterface.addColumn('members', 'countVisit', {
			type: Sequelize.DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		});
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('members', 'lastVisit');
		await queryInterface.removeColumn('members', 'countVisit');
		await queryInterface.removeColumn('members', 'activeUntil');
	},
} as Migration;
