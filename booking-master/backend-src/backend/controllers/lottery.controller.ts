import { NextFunction, Request, Response } from 'express';
import { UniqueConstraintError } from 'sequelize';
import { CONFLICT_ERROR, RESPONSE_SUCCESS, SESSION_ERROR, SYSTEM_ERROR } from '../config/constants';
import { LotteryService } from '../services/lottery.service';
import { AppError, writeLog, FileUtility } from '~utilities';
import { createGigaImageMessage, getBot } from '../services/linebot.service';
import { CustomerService } from '../services/customer.service';
import { CouponService } from '~services/coupon.service';
import { CouponModel } from '../models/coupon.model';
import { sendMessage } from '../services/lineService';

export class LotteryController {
	static async createLottery(req: Request, res: Response, next: NextFunction) {
		const picUrl = req.file?.filename;
		try {
			const { title, description, start, end } = req.body;
			if (!(title && description && start && end))
				throw new AppError(SYSTEM_ERROR, `invalid parameters ${req.body}`, false);

			const result = await LotteryService.createLottery({
				title,
				description,
				start,
				end,
				picUrl: picUrl,
			});
			if (result == null) throw new AppError(SYSTEM_ERROR, 'could not create lottery', false);

			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			if (picUrl) {
				await FileUtility.deleteFile(`public/uploads/${picUrl}`, (err) => {
					writeLog({ msg: 'delete lottery file', err: err }, 'error');
				});
			}
			next(e);
		}
	}
	static async getLotteryDetail(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			const lottery = await LotteryService.getLotteryDetailed(lotteryId);
			res.send(lottery);
		} catch (e) {
			next(e);
		}
	}
	static async getLotteryWinners(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			const condition: searchParams = {
				pp: parseInt(req.query.pp as string) || 20,
				p: parseInt(req.query.p as string) || 1,
				sortKey: req.query.sortKey ? (req.query.sortKey as string) : 'drawDate',
				sort: req.query.sort == 'asc' ? 'asc' : 'desc',
			};
			const result = await LotteryService.getLotteryWinners(lotteryId, condition);
			res.send({ ...condition, ...result });
		} catch (e) {
			next(e);
		}
	}
	static async updateLottery(req: Request, res: Response, next: NextFunction) {
		const lotteryId = parseInt(req.params.lotteryId);
		const picUrl = req.file?.filename;
		try {
			const { title, description, start, end } = req.body;
			if (!lotteryId || isNaN(lotteryId)) throw new AppError(SYSTEM_ERROR, 'invalid parameter lotteryId', false);

			await LotteryService.updateLottery({
				lotteryId,
				title,
				description,
				start,
				end,
				picUrl: picUrl,
			});
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			if (picUrl) {
				await FileUtility.deleteFile(`public/uploads/${picUrl}`, (err) => {
					writeLog({ msg: 'delete lottery file', err: err }, 'error');
				});
			}
			next(e);
		}
	}
	static async deleteLotteryDraw(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			const drawId = parseInt(req.params.drawId);
			if (!lotteryId || isNaN(lotteryId)) throw new AppError(SYSTEM_ERROR, 'invalid parameters lotteryId', false);

			if (!drawId || isNaN(drawId)) throw new AppError(SYSTEM_ERROR, 'invalid parameters drawId', false);

			await LotteryService.deleteLotteryDraw(lotteryId, drawId);
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			next(e);
		}
	}
	static async deleteLottery(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			if (!lotteryId || isNaN(lotteryId)) throw new AppError(SYSTEM_ERROR, 'invalid parameters lotteryId', false);

			const oldPicName = await LotteryService.deleteLottery(lotteryId);
			if (oldPicName) {
				await FileUtility.deleteFile(`public/uploads/${oldPicName}`, (err) => {
					writeLog({ msg: 'delete lottery file', err: err }, 'error');
				});
			}
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			next(e);
		}
	}
	static async checkUser(req: Request, res: Response, next: NextFunction) {
		try {
			const customer = await CustomerService.getCustomerAPI(res.locals.memberLine);
			if (customer == null)
				throw new AppError(SESSION_ERROR, `customer ${res.locals.memberLine.userId} not registered`, false);
			else next();
		} catch (e) {
			next(e);
		}
	}
	static async browseLotteries(req: Request, res: Response, next: NextFunction) {
		try {
			const sortKeys = ['title', 'lotteryId', 'start', 'end'];
			const params: searchParams = {
				pp: parseInt(req.query.pp as string) || 20,
				p: parseInt(req.query.p as string) || 1,
				sortKey: sortKeys.includes(req.query.sortKey as string) ? (req.query.sortKey as string) : 'lotteryId',
				sort: req.query.sort == 'asc' ? 'asc' : 'desc',
			};
			const result = await LotteryService.browseLotteries(params);
			res.send(result);
		} catch (e) {
			next(e);
		}
	}
	static async listLotteries(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteries = await LotteryService.listLotteries();
			res.json(lotteries);
		} catch (e) {
			next(e);
		}
	}
	//LIFF
	static async lotteryDetails(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			if (!lotteryId || isNaN(lotteryId)) throw new AppError(SYSTEM_ERROR, 'invalid parameter lotteryId', false);

			const [lottery, draws] = await Promise.all([
				LotteryService.getLotteryDetailedForLIFF(lotteryId),
				CustomerService.getCustomerAPI(res.locals.memberLine).then((customer) =>
					customer == null
						? Promise.reject(`getLotteryInfo customer ${res.locals.memberLine.userId} not registered`)
						: LotteryService.getCustomerDraws(customer.memberId, lotteryId),
				),
			]);
			if (lottery == null) throw new AppError(SYSTEM_ERROR, `${lotteryId} does not exist`, false);

			res.send({ ...lottery.toJSON(), draws: draws });
		} catch (e) {
			next(e);
		}
	}
	static async getLotteryInfo(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			if (!lotteryId || isNaN(lotteryId)) throw new AppError(SYSTEM_ERROR, 'invalid parameter lotteryId', false);

			const customer = await CustomerService.getCustomerAPI(res.locals.memberLine);
			if (customer == null)
				throw new AppError(SESSION_ERROR, `customer ${res.locals.memberLine.userId} not registered`, false);

			const draws = await LotteryService.getCustomerDraws(customer.memberId, lotteryId);
			res.send(draws);
		} catch (e) {
			if (e instanceof UniqueConstraintError) res.sendStatus(CONFLICT_ERROR);
			else next(e);
		}
	}
	static async drawLottery(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			if (!lotteryId || isNaN(lotteryId)) throw new AppError(SYSTEM_ERROR, 'invalid parameter lotteryId', false);

			const customer = await CustomerService.getCustomerAPI(res.locals.memberLine);
			if (customer == null)
				throw new AppError(SYSTEM_ERROR, `customer ${res.locals.memberLine.userId} is not registered`);

			const prize = await LotteryService.drawLottery(customer.memberId, lotteryId);
			const sendMessageDelayed = (lineId: string, coupon: CouponModel) =>
				new Promise((resolve) => {
					setTimeout(async () => {
						const imageMsg = createGigaImageMessage(coupon);
						try {
							await sendMessage(lineId, imageMsg as any);
						} catch (error) {
							console.log('drawLottery sendMessage error', error);
						}
						resolve(true);
					}, 1000);
				});
			if (customer.lineId && prize.Coupon) {
				sendMessageDelayed(customer.lineId, prize.Coupon);
			}
			res.json(prize);
		} catch (e) {
			if (e instanceof UniqueConstraintError) res.sendStatus(CONFLICT_ERROR);
			else next(e);
		}
	}
	static async getLotteryPrizes(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			if (!lotteryId || isNaN(lotteryId)) throw new AppError(SYSTEM_ERROR, 'invalid lotteryId', false);

			const sortKeys = ['prizeId', 'name', 'remainingAmount', 'weight'];
			const params: searchParams = {
				pp: parseInt(req.query.pp as string) || 20,
				p: parseInt(req.query.p as string) || 1,
				sortKey: sortKeys.includes(req.query.sortKey as string) ? (req.query.sortKey as string) : 'prizeId',
				sort: req.query.sort == 'asc' ? 'asc' : 'desc',
			};
			const result = await LotteryService.getLotteryPrizes(lotteryId, params);
			res.send({
				pp: params.pp,
				p: params.p,
				sort: params.sort,
				sortKey: params.sortKey,
				...result,
			});
		} catch (e) {
			next(e);
		}
	}
	static async createLotteryPrize(req: Request, res: Response, next: NextFunction) {
		const picUrl = req.file?.filename;
		try {
			const params = req.body;
			const lotteryId = parseInt(req.params.lotteryId);
			if (
				!params.name ||
				isNaN(params.remainingAmount) ||
				params.weight == undefined ||
				!lotteryId ||
				isNaN(lotteryId)
			) {
				throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
			}
			const couponId = isNaN(params.couponId) ? null : parseInt(params.couponId);
			if (couponId) {
				const coupon = await CouponService.getCoupon({ couponId: couponId });
				if (coupon == null) throw new AppError(SYSTEM_ERROR, `invalid coupon id ${couponId}`, false);
			}
			await LotteryService.addLotteryPrize({
				lotteryId: lotteryId,
				couponId: couponId,
				name: params.name,
				remainingAmount: params.remainingAmount,
				weight: params.weight,
				isMiss: params.isMiss === 'true' || params.isMiss === true,
				picUrl: picUrl ?? null,
			});
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			if (picUrl) {
				await FileUtility.deleteFile(`public/uploads/${picUrl}`, (err) => {
					writeLog({ msg: 'delete lottery prize file', err: err }, 'error');
				});
			}
			next(e);
		}
	}
	static async updateLotteryPrize(req: Request, res: Response, next: NextFunction) {
		const picUrl = req.file?.filename ?? req.body.picUrl ?? null;
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			const prizeId = parseInt(req.params.prizeId);
			const params = req.body;
			if (!lotteryId || !prizeId) throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);
			const couponId = isNaN(params.couponId) ? null : parseInt(params.couponId);
			if (couponId) {
				const coupon = await CouponService.getCoupon({ couponId: couponId });
				if (coupon == null) throw new AppError(SYSTEM_ERROR, `coupon ${couponId} does not exist`);
			}
			await LotteryService.updateLotteryPrize({
				lotteryId: lotteryId,
				couponId: couponId ?? null,
				prizeId: prizeId,
				name: params.name,
				remainingAmount: params.remainingAmount,
				weight: params.weight,
				isMiss: params.isMiss === 'true' || params.isMiss === true,
				picUrl: picUrl ?? null,
			});
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			if (picUrl) {
				await FileUtility.deleteFile(`public/uploads/${picUrl}`, (err) => {
					writeLog({ msg: 'delete lottery prize file', err: err }, 'error');
				});
			}
			next(e);
		}
	}
	static async deleteLotteryPrize(req: Request, res: Response, next: NextFunction) {
		try {
			const lotteryId = parseInt(req.params.lotteryId);
			const prizeId = parseInt(req.params.prizeId);
			if (!lotteryId || !prizeId) throw new AppError(SYSTEM_ERROR, 'invalid parameters', false);

			await LotteryService.deleteLotteryPrize({
				lotteryId: lotteryId,
				prizeId: prizeId,
			});
			res.sendStatus(RESPONSE_SUCCESS);
		} catch (e) {
			next(e);
		}
	}
}
