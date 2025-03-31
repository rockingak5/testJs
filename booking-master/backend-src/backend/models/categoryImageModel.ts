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
export class CategoryImage extends Model<
	InferAttributes<CategoryImage, { omit: 'Category' | 'Campaign' }>,
	InferCreationAttributes<CategoryImage, { omit: 'Category' | 'Campaign' }>
> {
	//ATTRIBUTES
	declare categoryImageId: CreationOptional<number>;
	declare categoryId?: ForeignKey<Category['categoryId']>;
	declare campaignId?: ForeignKey<Campaign['campaignId']>;
	declare picUrl: string;
	declare showOrder: number;
	//ASSOCIATIONS
	declare Category?: NonAttribute<Category>;
	declare Campaign?: NonAttribute<Campaign>;
	declare static associations: {
		Category: Association<Category, CategoryImage>;
		Campaign: Association<Campaign, CategoryImage>;
	};
	static initClass = (sequelize: Sequelize) =>
		CategoryImage.init(
			{
				categoryImageId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				picUrl: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'categoryImages',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CategoryImage',
					plural: 'categoryImages',
				},
			},
		);
}
