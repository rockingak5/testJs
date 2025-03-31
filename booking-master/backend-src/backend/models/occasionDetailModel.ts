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
export class OccasionDetail extends Model<
	InferAttributes<OccasionDetail, { omit: 'Occasion' | 'Gift' }>,
	InferCreationAttributes<OccasionDetail, { omit: 'Occasion' | 'Gift' }>
> {
	//ATTRIBUTES
	declare occasionDetailId: CreationOptional<number>;
	declare occasionId: ForeignKey<Occasion['occasionId']>;
	declare giftId: ForeignKey<Gift['giftId']>;
	declare label: string;
	declare value: string;
	declare showOrder: number;
	//ASSOCIATIONS
	declare Occasion?: NonAttribute<Occasion>;
	declare Gift?: NonAttribute<Gift>;
	declare static associations: {
		Occasion: Association<Occasion, OccasionDetail>;
		Gift: Association<Gift, OccasionDetail>;
	};
	static initClass = (sequelize: Sequelize) =>
		OccasionDetail.init(
			{
				occasionDetailId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					primaryKey: true,
					autoIncrement: true,
				},
				label: { type: DataTypes.STRING, allowNull: false },
				value: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'occasionDetails',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'OccasionDetail',
					plural: 'occasionDetails',
				},
			},
		);
}
