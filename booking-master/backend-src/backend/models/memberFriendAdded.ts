import { Association, CreationOptional, DataTypes, Model, Sequelize } from 'sequelize';
import { DATABASE_TABLE_NAME } from '~config';
import { Member } from './memberModel';

export class MemberFriendAdded extends Model {
	//TIMESTAMPS
	declare memberFriendAddedId: CreationOptional<number>;

	declare lineId: string;
	declare addedDate: Date | null;

	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	//ASSOCIATIONS

	declare static associations: {
		Member: Association<MemberFriendAdded, Member>;
	};
	static initClass = (sequelize: Sequelize) =>
		MemberFriendAdded.init(
			{
				memberFriendAddedId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				lineId: { type: DataTypes.STRING, unique: true, allowNull: false },
				addedDate: { type: DataTypes.DATE, allowNull: true, defaultValue: null },

				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: DATABASE_TABLE_NAME.MEMBER_FRIEND_ADDED,
				modelName: 'memberFriendAdded',
				name: {
					singular: 'memberFriendAdded',
					plural: DATABASE_TABLE_NAME.MEMBER_FRIEND_ADDED,
				},
			},
		);
}
