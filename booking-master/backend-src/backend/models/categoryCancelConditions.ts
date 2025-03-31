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
import { Category } from './categoryModel';

export class CategoryCancelCondition extends Model<
	InferAttributes<CategoryCancelCondition, { omit: 'Member' }>,
	InferCreationAttributes<CategoryCancelCondition, { omit: 'Member' }>
> {
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
		Member: Association<Member, CategoryCancelCondition>;
		Category: Association<Category, CategoryCancelCondition>;
	};
	declare id: CreationOptional<number>;
	declare categoryId: ForeignKey<number>;
	static initClass = (sequelize: Sequelize) =>
		CategoryCancelCondition.init(
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
						name: 'categoryCancelConditionUnique',
						unique: true,
						fields: ['day', 'hour', 'minute', 'category_id'],
					},
				],
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				underscored: true,
				tableName: 'category_cancel_conditions',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CategoryCancelCondition',
					plural: 'cancelConditions',
				},
			},
		);
}
