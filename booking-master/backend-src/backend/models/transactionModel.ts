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
import { PAYMENT_STATUS, PAYMENT_TYPE } from '../config';

export class Transaction extends Model<
	InferAttributes<Transaction, { omit: 'Member' }>,
	InferCreationAttributes<Transaction, { omit: 'Member' }>
> {
	//ATTRIBUTES
	// declare chatId: CreationOptional<number>
	declare amount: number;
	declare status: CreationOptional<PAYMENT_STATUS>;
	// declare contentType: CreationOptional<chatContentType>
	// declare source: chatSource
	// //TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	declare type: PAYMENT_TYPE;
	// //ASSOCIATIONS
	declare Member?: NonAttribute<Member>;
	declare static associations: {
		Member: Association<Member, Transaction>;
	};
	declare id: CreationOptional<number>;
	declare orderId: string;
	declare paymentKeyExpiryTime?: string;
	declare memberId: ForeignKey<number>;
	declare occurrenceId: ForeignKey<number>;
	declare registrationId?: ForeignKey<number>;
	static initClass = (sequelize: Sequelize) =>
		Transaction.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				amount: {
					type: DataTypes.DECIMAL(10, 2),
					allowNull: false,
				},
				orderId: {
					type: DataTypes.STRING,
					allowNull: false,
					unique: false,
				},
				type: {
					type: DataTypes.ENUM(...Object.values(PAYMENT_TYPE)),
					allowNull: false,
					defaultValue: PAYMENT_TYPE.PURCHASE,
				},
				status: {
					type: DataTypes.ENUM(...Object.values(PAYMENT_STATUS)),
					defaultValue: PAYMENT_STATUS.PENDING,
				},
				paymentKeyExpiryTime: {
					type: DataTypes.STRING,
					allowNull: true,
				},
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				underscored: true,
				tableName: 'transactions',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'Transaction',
					plural: 'Transactions',
				},
			},
		);
}
