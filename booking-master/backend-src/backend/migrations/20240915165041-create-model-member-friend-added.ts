import { Migration } from 'sequelize-cli';
import { DATABASE_TABLE_NAME } from '../config/constants';

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.createTable(DATABASE_TABLE_NAME.MEMBER_FRIEND_ADDED, {
				memberFriendAddedId: {
					type: Sequelize.DataTypes.INTEGER({ unsigned: true }),
					autoIncrement: true,
					primaryKey: true,
				},
				lineId: { type: Sequelize.DataTypes.STRING, unique: true, allowNull: false },
				addedDate: { type: Sequelize.DataTypes.DATE, allowNull: true, defaultValue: null },
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
			console.log('20240915165041-create-model-member-friend-added', error);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();

		try {
			await queryInterface.sequelize.query(`DROP TABLE IF EXISTS \`${DATABASE_TABLE_NAME.MEMBER_FRIEND_ADDED}\``, {
				type: Sequelize.QueryTypes.DELETE,
				transaction,
			});
			await transaction.commit();
		} catch (error) {
			console.log('20240915165041-create-model-member-friend-added', error);
			await transaction.rollback();
		}
	},
} as Migration;
