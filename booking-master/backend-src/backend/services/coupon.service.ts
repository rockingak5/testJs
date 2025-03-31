import { col, CreationAttributes, Transaction, WhereAttributeHash } from 'sequelize';
import { db } from '../models';
import type { CouponModel } from '../models/coupon.model';
import { FileUtility, writeLog } from '~utilities';

export class CouponService {
	static async createCoupon(params: CreationAttributes<CouponModel>, transaction?: Transaction) {
		return db.coupons.create(params, { transaction });
	}
	static async getCoupon(couponWhere: WhereAttributeHash, transaction?: Transaction) {
		return db.coupons.findOne({ where: couponWhere, transaction });
	}
	static async browseCoupons(couponWhere: WhereAttributeHash, pagination: searchParams, transaction?: Transaction) {
		return db.coupons.findAndCountAll({
			where: couponWhere,
			limit: pagination.pp as number,
			offset: ((pagination.p as number) - 1) * (pagination.pp as number),
			order: [[col(pagination.sortKey), pagination.sort as string]],
			transaction,
		});
	}
	static async listCoupons(transaction?: Transaction) {
		return db.coupons.findAll({ attributes: ['couponId', 'title'], transaction });
	}

	static async updateCoupon(couponId: number, params: CreationAttributes<CouponModel>, transaction?: Transaction) {
		const coupon = await db.coupons.findByPk(couponId, { transaction });
		if (coupon == null) throw new Error('coupon not found');

		const oldPicUrl = coupon.picUrl;
		coupon.set({
			title: params.title ?? null,
			body: params.body ?? null,
			url: params.url ?? null,
			picUrl: params.picUrl ? params.picUrl : coupon.picUrl,
		});
		if (coupon.picUrl && coupon.picUrl != params.picUrl) {
			await FileUtility.deleteFile(`public/uploads/coupons/${oldPicUrl}`, (err) => {
				writeLog({ msg: 'update coupon pic file', err: err }, 'error');
			});
		}
		return await coupon.save({ transaction });
	}

	static async deleteCoupon(couponId: number, transaction?: Transaction) {
		const coupon = await db.coupons.findByPk(couponId, { transaction });
		if (coupon == null) return;
		if (coupon.picUrl) {
			await FileUtility.deleteFile(`public/uploads/coupons/${coupon.picUrl}`, (err) => {
				writeLog({ msg: 'delete coupon pic file', err: err }, 'error');
			});
		}
		return await coupon.destroy({ transaction });
	}
}
