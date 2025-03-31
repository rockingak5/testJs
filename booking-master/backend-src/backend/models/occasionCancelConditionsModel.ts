import { Association, CreationOptional, DataTypes, ForeignKey, Model, NonAttribute, Sequelize } from 'sequelize';
import { Member } from './memberModel';
import { Occasion } from './occasionModel';

export class OccasionCancelCondition extends Model {
	//ATTRIBUTES
	// declare chatId: CreationOptional<number>
	declare name: string;
	declare day: number;
	declare hour: number;
	declare minute: number;
	declare refundPercentage: number;
	// //TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	// //ASSOCIATIONS
	declare Member?: NonAttribute<Member>;
	declare static associations: {
		Member: Association<Member, OccasionCancelCondition>;
		Occasion: Association<Occasion, OccasionCancelCondition>;
	};
	declare id: CreationOptional<number>;
	declare categoryId: ForeignKey<number>;
	static initClass = (sequelize: Sequelize) =>
		OccasionCancelCondition.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				name: {
					type: DataTypes.STRING,
					allowNull: false,
				},
				day: { type: DataTypes.INTEGER, allowNull: false },
				hour: {
					type: DataTypes.INTEGER,
					allowNull: false,
					validate: {
						min: 0,
						max: 23,
					},
				},
				minute: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0, max: 59 } },
				refundPercentage: {
					type: DataTypes.INTEGER,
					allowNull: false,
					validate: {
						min: 0,
						max: 100,
					},
				},
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				indexes: [
					{
						name: 'occasionCancelConditionUnique',
						unique: true,
						fields: ['day', 'hour', 'minute', 'occasion_id'],
					},
				],
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				underscored: true,
				tableName: 'occasion_cancel_conditions',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'OccasionCancelCondition',
					plural: 'cancelConditions',
				},
			},
		);
}
