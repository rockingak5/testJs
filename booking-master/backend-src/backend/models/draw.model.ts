import {
	CreationOptional,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	Model,
	NOW,
	NonAttribute,
	Sequelize,
	Association,
} from 'sequelize';
import { LotteryModel } from './lottery.model';
import { LotteryPrizeModel } from './lotteryPrize.model';
import { Member } from './memberModel';
export class DrawModel extends Model<
	InferAttributes<DrawModel, { omit: 'member' | 'Lottery' | 'LotteryPrize' }>,
	InferCreationAttributes<DrawModel, { omit: 'member' | 'Lottery' | 'LotteryPrize' }>
> {
	declare drawId: CreationOptional<number>;
	declare customerId: number;
	declare lotteryId: number;
	declare prizeId: number;
	declare drawDate: CreationOptional<Date>;
	//TIMESTAMPS
	declare createdAt?: CreationOptional<Date>;
	declare updatedAt?: CreationOptional<Date>;
	declare deletedAt?: CreationOptional<Date>;
	//ASSOCIATIONS
	declare member?: NonAttribute<Member>;
	declare Lottery?: NonAttribute<LotteryModel>;
	declare LotteryPrize?: NonAttribute<LotteryPrizeModel>;
	declare static associations: {
		member: Association<DrawModel, Member>;
		Lottery: Association<DrawModel, LotteryModel>;
		LotteryPrize: Association<DrawModel, LotteryPrizeModel>;
	};
	static initClass = (sequelize: Sequelize) =>
		DrawModel.init(
			{
				drawId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
				customerId: { type: DataTypes.INTEGER, allowNull: false },
				lotteryId: { type: DataTypes.INTEGER, allowNull: false },
				prizeId: { type: DataTypes.INTEGER, allowNull: false },
				drawDate: { type: DataTypes.DATE, allowNull: false, defaultValue: NOW },
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: true,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'draws',
				modelName: 'Draw',
				name: {
					singular: 'Draw',
					plural: 'draws',
				},
			},
		);
}
