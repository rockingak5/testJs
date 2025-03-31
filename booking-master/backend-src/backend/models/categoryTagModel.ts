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
import { Campaign } from './campaignModel';
export class CategoryTag extends Model<
	InferAttributes<CategoryTag, { omit: 'Category' | 'Campaign' }>,
	InferCreationAttributes<CategoryTag, { omit: 'Category' | 'Campaign' }>
> {
	//ATTRIBUTES
	declare categoryTagId: CreationOptional<number>;
	declare categoryId?: ForeignKey<Category['categoryId']>;
	declare campaignId?: ForeignKey<Campaign['campaignId']>;
	declare contents: string;
	declare showOrder: number;
	//ASSOCIATIONS
	declare Category?: NonAttribute<Category>;
	declare Campaign?: NonAttribute<Campaign>;
	declare static associations: {
		Category: Association<Category, CategoryTag>;
		Campaign: Association<Campaign, CategoryTag>;
	};
	static initClass = (sequelize: Sequelize) =>
		CategoryTag.init(
			{
				categoryTagId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				contents: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'categoryTags',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CategoryTag',
					plural: 'categoryTags',
				},
			},
		);
}
