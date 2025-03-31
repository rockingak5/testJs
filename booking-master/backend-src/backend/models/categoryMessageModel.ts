import {
	Sequelize,
	Model,
	Association,
	DataTypes,
	CreationOptional,
	InferAttributes,
	InferCreationAttributes,
	NonAttribute,
	ForeignKey,
} from 'sequelize';
import { Category } from './categoryModel';
export class CategoryMessage extends Model<
	InferAttributes<CategoryMessage, { omit: 'Category' }>,
	InferCreationAttributes<CategoryMessage, { omit: 'Category' }>
> {
	//ATTRIBUTES
	declare categoryMessageId: CreationOptional<number>;
	declare categoryId: ForeignKey<Category['categoryId']>;
	declare label: string;
	declare showOrder: number;

	declare type: string;
	declare option: JSON;
	declare required: boolean;

	//ASSOCIATIONS
	declare Category?: NonAttribute<Category>;
	declare static associations: {
		Category: Association<Category, CategoryMessage>;
	};
	static initClass = (sequelize: Sequelize) =>
		CategoryMessage.init(
			{
				categoryMessageId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					primaryKey: true,
					autoIncrement: true,
				},

				label: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false },

				type: { type: DataTypes.STRING, allowNull: true, defaultValue: 'text' },
				option: { type: DataTypes.JSON, allowNull: true },
				required: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'categoryMessages',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CategoryMessage',
					plural: 'categoryMessages',
				},
			},
		);
}
