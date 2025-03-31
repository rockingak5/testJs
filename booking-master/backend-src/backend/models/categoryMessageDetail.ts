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
import { Category } from './categoryModel';
import { Occasion } from './occasionModel';

export class CategoryMessageDetail extends Model<
	InferAttributes<CategoryMessageDetail>,
	InferCreationAttributes<CategoryMessageDetail>
> {
	//ATTRIBUTES
	declare id: CreationOptional<number>;
	declare categoryId: ForeignKey<Category['categoryId']>;
	declare occasionId: ForeignKey<Occasion['occasionId']>;
	declare afterReservationMessage: CreationOptional<string>;
	declare reminderMessageThreeDays: CreationOptional<string>;
	declare reminderMessageOneDay: CreationOptional<string>;
	declare winners: CreationOptional<string>;

	// //TIMESTAMPS
	declare createdAt?: CreationOptional<Date>;
	declare updatedAt?: CreationOptional<Date>;
	// //ASSOCIATIONS
	declare Category?: NonAttribute<Category>;
	declare Occasion?: NonAttribute<Category>;
	declare static associations: {
		Category: Association<Category, CategoryMessageDetail>;
		Occasion: Association<Occasion, CategoryMessageDetail>;
	};
	static initClass = (sequelize: Sequelize) =>
		CategoryMessageDetail.init(
			{
				id: {
					type: DataTypes.INTEGER,
					autoIncrement: true,
					primaryKey: true,
				},
				afterReservationMessage: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				reminderMessageThreeDays: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				reminderMessageOneDay: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				winners: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
			},
			{
				sequelize: sequelize,
				timestamps: true,
				tableName: 'categoryMessageDetails',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CategoryMessageDetail',
					plural: 'categoryMessageDetails',
				},
			},
		);
}
