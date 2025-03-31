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
export class CategoryDetail extends Model<
	InferAttributes<CategoryDetail, { omit: 'Category' | 'Campaign' }>,
	InferCreationAttributes<CategoryDetail, { omit: 'Category' | 'Campaign' }>
> {
	//ATTRIBUTES
	declare categoryDetailId: CreationOptional<number>;
	declare categoryId?: ForeignKey<Category['categoryId']>;
	declare campaignId?: ForeignKey<Campaign['campaignId']>;
	declare label: string;
	declare value: string;
	declare showOrder: number;
	//ASSOCIATIONS
	declare Category?: NonAttribute<Category>;
	declare Campaign?: NonAttribute<Campaign>;
	declare static associations: {
		Category: Association<Category, CategoryDetail>;
		Campaign: Association<Campaign, CategoryDetail>;
	};
	static initClass = (sequelize: Sequelize) =>
		CategoryDetail.init(
			{
				categoryDetailId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					primaryKey: true,
					autoIncrement: true,
				},
				label: { type: DataTypes.STRING, allowNull: false },
				value: { type: DataTypes.STRING, allowNull: true },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'categoryDetails',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CategoryDetail',
					plural: 'categoryDetails',
				},
			},
		);
}
