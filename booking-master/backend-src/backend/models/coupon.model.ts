import {
	Association,
	CreationOptional,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	Model,
	NonAttribute,
	Sequelize,
} from 'sequelize';
import { LotteryPrizeModel } from './lotteryPrize.model';

export class CouponModel extends Model<
	InferAttributes<CouponModel, { omit: 'lotteryPrizes' }>,
	InferCreationAttributes<CouponModel, { omit: 'lotteryPrizes' }>
> {
	declare couponId: CreationOptional<number>;
	declare title: string | null;
	declare body: string | null;
	declare url: string | null;
	declare picUrl: string | null;
	declare createdAt?: CreationOptional<Date>;
	declare updatedAt?: CreationOptional<Date>;

	declare lotteryPrizes?: NonAttribute<LotteryPrizeModel[]>;
	declare static associations: {
		lotteryPrizes: Association<CouponModel, LotteryPrizeModel>;
	};

	static initClass = (sequelize: Sequelize) =>
		CouponModel.init(
			{
				couponId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
				title: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
				body: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
				url: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
				picUrl: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
			},
			{
				sequelize: sequelize,
				timestamps: true,
				tableName: 'coupons',
				name: {
					singular: 'Coupon',
					plural: 'coupons',
				},
			},
		);
}
