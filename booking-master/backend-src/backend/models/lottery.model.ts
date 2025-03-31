import {
	Model,
	Sequelize,
	DataTypes,
	Association,
	CreationOptional,
	InferAttributes,
	InferCreationAttributes,
	NonAttribute,
} from 'sequelize';
import { DrawModel } from './draw.model';
import { LotteryPrizeModel } from './lotteryPrize.model';
export class LotteryModel extends Model<
	InferAttributes<LotteryModel, { omit: 'draws' | 'lotteryPrizes' }>,
	InferCreationAttributes<LotteryModel, { omit: 'draws' | 'lotteryPrizes' }>
> {
	//ATTRIBUTES
	declare lotteryId: CreationOptional<number>;
	declare title: string;
	declare description: string;
	declare start: Date;
	declare end: Date;
	declare picUrl: string | null;
	//TIMESTAMPS
	declare updatedAt?: CreationOptional<Date>;
	declare createdAt?: CreationOptional<Date>;
	declare deletedAt?: CreationOptional<Date>;
	//ASSOCIATIONS
	declare draws?: NonAttribute<DrawModel[]>;
	declare lotteryPrizes?: NonAttribute<LotteryPrizeModel[]>;

	declare static associations: {
		draws: Association<LotteryModel, DrawModel>;
		lotteryPrizes: Association<LotteryModel, LotteryPrizeModel>;
	};
	//METHODS
	static initClass = (sequelize: Sequelize) =>
		LotteryModel.init(
			{
				lotteryId: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
				title: { type: DataTypes.STRING(100), allowNull: false },
				description: { type: DataTypes.STRING(500), allowNull: false },
				start: { type: DataTypes.DATE, allowNull: false },
				end: { type: DataTypes.DATE, allowNull: false },
				picUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
			},
			{
				sequelize: sequelize,
				paranoid: true,
				timestamps: true,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'lotteries',
				name: {
					singular: 'Lottery',
					plural: 'lotteries',
				},
			},
		);
}
