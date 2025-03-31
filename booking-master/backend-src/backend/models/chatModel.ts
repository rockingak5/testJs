import {
	Sequelize,
	Model,
	Association,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	ForeignKey,
	NonAttribute,
} from 'sequelize';
import { Member } from './memberModel';
export class Chat extends Model<
	InferAttributes<Chat, { omit: 'Member' }>,
	InferCreationAttributes<Chat, { omit: 'Member' }>
> {
	//ATTRIBUTES
	declare chatId: CreationOptional<number>;
	declare memberId: ForeignKey<Member['memberId']>;
	declare contents: string;
	declare contentType: CreationOptional<chatContentType>;
	declare source: chatSource;
	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	//ASSOCIATIONS
	declare Member?: NonAttribute<Member>;
	declare static associations: {
		Member: Association<Member, Chat>;
	};
	static initClass = (sequelize: Sequelize) =>
		Chat.init(
			{
				chatId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				contents: { type: DataTypes.TEXT, allowNull: false },
				contentType: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'text' },
				source: { type: DataTypes.STRING, allowNull: false },
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				tableName: 'chats',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'Chat',
					plural: 'chats',
				},
			},
		);
}
