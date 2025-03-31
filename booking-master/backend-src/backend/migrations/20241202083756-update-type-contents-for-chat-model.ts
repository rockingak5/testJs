import { QueryInterface, DataTypes } from 'sequelize';
import { DATABASE_TABLE_NAME } from '~config';

module.exports = {
	up: async (queryInterface: QueryInterface) => {
		try {
			await queryInterface.changeColumn(DATABASE_TABLE_NAME.CHAT, 'contents', {
				type: DataTypes.TEXT,
			});
		} catch (err) {
			console.log('20241202083756-update-type-contents-for-chat-model error', err);
			throw err;
		}
	},

	down: async (queryInterface: QueryInterface) => {
		try {
			await queryInterface.changeColumn(DATABASE_TABLE_NAME.CHAT, 'contents', {
				type: DataTypes.STRING,
			});
		} catch (err) {
			console.log('20241202083756-update-type-contents-for-chat-model error', err);
			throw err;
		}
	},
};
