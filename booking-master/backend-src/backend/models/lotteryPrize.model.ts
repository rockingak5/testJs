import {
	Model,
	Association,
	Sequelize,
	DataTypes,
	NonAttribute,
	CreationOptional,
	InferAttributes,
	InferCreationAttributes,
	ForeignKey,
} from 'sequelize';
import { CouponModel } from './coupon.model';
import { LotteryModel } from './lottery.model';
export class LotteryPrizeModel extends Model<
	InferAttributes<LotteryPrizeModel, { omit: 'Lottery' | 'Coupon' }>,
	InferCreationAttributes<LotteryPrizeModel, { omit: 'Lottery' | 'Coupon' }>
> {
	declare prizeId: CreationOptional<number>;
	declare lotteryId: number;
	declare couponId: ForeignKey<CouponModel['couponId'] | null>;
	declare name: string;
	declare remainingAmount: CreationOptional<number>;
	declare weight: string;
	declare isMiss: CreationOptional<boolean>;
	declare picUrl: string | null;
	//TIMESTAMPS
	declare updatedAt?: CreationOptional<Date>;
	declare createdAt?: CreationOptional<Date>;
	declare deletedAt?: CreationOptional<Date>;
	//ASSOCIATIONS
	declare Coupon?: NonAttribute<CouponModel>;
	declare Lottery?: NonAttribute<LotteryModel>;
	declare static associations: {
		Coupon: Association<LotteryPrizeModel, CouponModel>;
		Lottery: Association<LotteryPrizeModel, LotteryModel>;
	};
	static initClass = (sequelize: Sequelize) =>
		LotteryPrizeModel.init(
			{
				prizeId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
				lotteryId: { type: DataTypes.INTEGER, allowNull: false },
				name: { type: DataTypes.STRING(100), allowNull: false },
				remainingAmount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
				weight: { type: DataTypes.STRING, allowNull: false },
				isMiss: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				picUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
			},
			{
				sequelize: sequelize,
				paranoid: true,
				timestamps: true,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'lotteryPrizes',
				modelName: 'LotteryPrize',
				name: {
					singular: 'LotteryPrize',
					plural: 'lotteryPrizes',
				},
			},
		);
}
