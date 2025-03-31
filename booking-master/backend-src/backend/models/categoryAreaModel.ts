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
export class CategoryArea extends Model<
	InferAttributes<CategoryArea, { omit: 'Category' | 'Campaign' }>,
	InferCreationAttributes<CategoryArea, { omit: 'Category' | 'Campaign' }>
> {
	//ATTRIBUTES
	declare categoryAreaId: CreationOptional<number>;
	declare categoryId?: ForeignKey<Category['categoryId']>;
	declare campaignId?: ForeignKey<Campaign['campaignId']>;
	declare contents: string;
	declare showOrder: number;
	//ASSOCIATIONS
	declare Category?: NonAttribute<Category>;
	declare Campaign?: NonAttribute<Campaign>;
	declare static associations: {
		Category: Association<Category, CategoryArea>;
		Campaign: Association<Campaign, CategoryArea>;
	};
	static initClass = (sequelize: Sequelize) =>
		CategoryArea.init(
			{
				categoryAreaId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				contents: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'categoryAreas',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CategoryArea',
					plural: 'categoryAreas',
				},
			},
		);
}
