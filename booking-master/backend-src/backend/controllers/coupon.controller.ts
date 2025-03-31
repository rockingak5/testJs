import { NextFunction, Request, Response } from 'express';
import { AppError, FileUtility, writeLog } from '~utilities';

import { RESPONSE_SUCCESS, SYSTEM_ERROR } from '../config/constants';
import { CouponService } from '../services/coupon.service';

export class CouponController {
	static async createCoupon(req: Request, res: Response, next: NextFunction) {
		const picUrl = req.file?.filename;
		try {
			const { title, body, url } = req.body as Record<string, string | null>;
			if (!(title || body || url || picUrl))
				throw new AppError(SYSTEM_ERROR, `invalid parameters ${JSON.stringify(req.body)}`, false);

			await CouponService.createCoupon({ title, body, url, picUrl });
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			if (picUrl) {
				await FileUtility.deleteFile(`public/uploads/coupons/${picUrl}`, (err) => {
					writeLog({ msg: 'delete coupon pic file', err: err }, 'error');
				});
			}
			next(e);
		}
	}
	static async browseCoupons(req: Request, res: Response, next: NextFunction) {
		try {
			const sortKeys = ['couponId', 'title', 'body', 'createdAt', 'updatedAt'];
			const params: searchParams = {
				pp: parseInt(req.query.pp as string) || 20,
				p: parseInt(req.query.p as string) || 1,
				sortKey: sortKeys.includes(req.query.sortKey as string) ? (req.query.sortKey as string) : 'couponId',
				sort: req.query.sort == 'asc' ? 'asc' : 'desc',
			};
			const coupons = await CouponService.browseCoupons({}, params);
			res.send({ ...params, ...coupons });
		} catch (e) {
			next(e);
		}
	}
	static async listCoupons(req: Request, res: Response, next: NextFunction) {
		try {
			const coupons = await CouponService.listCoupons();
			res.send(coupons);
		} catch (e) {
			next(e);
		}
	}

	static async updateCoupon(req: Request, res: Response, next: NextFunction) {
		const picUrl = req.file?.filename;
		const couponId = parseInt(req.params.couponId);
		try {
			const { title, body, url } = req.body;
			if (!couponId || isNaN(couponId)) throw new AppError(SYSTEM_ERROR, 'invalid parameter couponId', false);

			if (!(title || body || url)) throw new AppError(SYSTEM_ERROR, `invalid parameters ${JSON.stringify(req.body)}`);

			await CouponService.updateCoupon(couponId, { title, body, url, picUrl });
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			if (picUrl) {
				await FileUtility.deleteFile(`public/uploads/coupons/${picUrl}`, (err) => {
					writeLog({ msg: 'update coupon pic file', err: err }, 'error');
				});
			}
			next(e);
		}
	}

	static async deleteCoupon(req: Request, res: Response, next: NextFunction) {
		const couponId = parseInt(req.params.couponId);
		try {
			if (!couponId || isNaN(couponId)) throw new AppError(SYSTEM_ERROR, 'invalid parameter couponId', false);

			if (!couponId || isNaN(couponId)) throw new AppError(SYSTEM_ERROR, 'invalid parameter couponId', false);

			await CouponService.deleteCoupon(couponId);
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			next(e);
		}
	}
}
