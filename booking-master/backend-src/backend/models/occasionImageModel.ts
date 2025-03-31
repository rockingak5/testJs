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
import { Occasion } from './occasionModel';
import { Gift } from './giftModel';
export class OccasionImage extends Model<
	InferAttributes<OccasionImage, { omit: 'Occasion' | 'Gift' }>,
	InferCreationAttributes<OccasionImage, { omit: 'Occasion' | 'Gift' }>
> {
	//ATTRIBUTES
	declare occasionImageId: CreationOptional<number>;
	declare occasionId: ForeignKey<Occasion['occasionId']>;
	declare giftId: ForeignKey<Gift['giftId']>;
	declare picUrl: string;
	declare showOrder: number;
	//ASSOCIATIONS
	declare Occasion?: NonAttribute<Occasion>;
	declare Gift?: NonAttribute<Gift>;
	declare static associations: {
		Occasion: Association<Occasion, OccasionImage>;
		Gift: Association<Gift, OccasionImage>;
	};
	static initClass = (sequelize: Sequelize) =>
		OccasionImage.init(
			{
				occasionImageId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				picUrl: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'occasionImages',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'OccasionImage',
					plural: 'occasionImages',
				},
			},
		);
}
