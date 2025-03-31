import { db } from '../models';
import Chance from 'chance';
import { col, CreationAttributes, Op, QueryTypes } from 'sequelize';
import moment from 'moment';
import { LotteryPrizeModel } from '~models/lotteryPrize.model';
import { AppError, FileUtility, writeLog } from '~utilities';
import { LotteryModel } from '../models/lottery.model';
import { BAD_REQUEST, LABEL_FIRST_NAME_FOR_MEMBER, LABEL_LAST_NAME_FOR_MEMBER } from '../config/constants';
import { Member } from '~models/memberModel';
import { CustomerRegistration } from '~models/customerRegistrationModel';
const chance = new Chance();
export class LotteryService {
	static async getLottery(lotteryId: number) {
		return db.lotteries.findByPk(lotteryId);
	}
	static async getLotteryDetailed(lotteryId: number) {
		const [lottery, winnersCount] = await Promise.all([
			LotteryService.getLottery(lotteryId),
			db.sequelize.query(
				`SELECT DISTINCT prizeId, COUNT(drawId) winnersCount FROM ${db.draws.tableName} WHERE lotteryId = $lotteryId GROUP BY prizeId`,
				{
					bind: { lotteryId: lotteryId },
					type: QueryTypes.SELECT,
				},
			) as Promise<{ winnersCount: number }[]>,
		]);
		if (lottery == null) {
			return null;
		} else {
			const totalWinners = winnersCount.reduce((prev, cur) => {
				return prev + cur.winnersCount;
			}, 0);
			return {
				...lottery.toJSON(),
				totalWinners: totalWinners,
				winnersCount: winnersCount,
			};
		}
	}
	static async getLotteryDetailedForLIFF(lotteryId: number) {
		return db.lotteries.findByPk(lotteryId, {
			include: { association: db.lotteries.associations.lotteryPrizes },
		});
	}
	static async getLotteryWinners(lotteryId: number, pagination: searchParams) {
		const customerRegistrations = await db.customerRegistrations.findAll({
			where: {
				label: { [Op.in]: [LABEL_LAST_NAME_FOR_MEMBER, LABEL_FIRST_NAME_FOR_MEMBER] },
			},
			attributes: ['customerRegistrationId', 'label'],
		});
		const includesMember: any[] = [];
		if (customerRegistrations.length) {
			const customerFirstName = customerRegistrations.find(
				(customerRegistration) => customerRegistration.label === LABEL_FIRST_NAME_FOR_MEMBER,
			);
			if (customerFirstName) {
				includesMember.push([`customerRegistrationId${customerFirstName.customerRegistrationId}`, 'firstName']);
			}
			const customerLastName = customerRegistrations.find(
				(customerRegistration) => customerRegistration.label === LABEL_LAST_NAME_FOR_MEMBER,
			);
			if (customerLastName) {
				includesMember.push([`customerRegistrationId${customerLastName.customerRegistrationId}`, 'fullName']);
			}
		}
		return db.draws.findAndCountAll({
			where: { lotteryId },
			attributes: ['drawId', 'prizeId', 'drawDate'],
			include: [
				{
					model: db.members,
					attributes: {
						exclude: ['isAdmin', 'lineId'],
						include: includesMember,
					},
				},
				{
					association: db.draws.associations.LotteryPrize,
					attributes: ['name', 'isMiss'],
				},
			],
			limit: pagination.pp as number,
			offset: ((pagination.p as number) - 1) * (pagination.pp as number),
			order: [[col(pagination.sortKey), pagination.sort as string]],
		});
	}
	static async getCustomerDraws(customerId: number, lotteryId: number) {
		return db.draws.findAll({
			where: { customerId: customerId, lotteryId: lotteryId },
		});
	}
	static async drawLottery(customerId: number, lotteryId: number) {
		const lottery = await db.lotteries.findByPk(lotteryId, {
			include: [
				{
					association: db.lotteries.associations.lotteryPrizes,
					include: [{ association: db.lotteryPrizes.associations.Coupon }],
					separate: true,
					where: { remainingAmount: { [Op.gt]: 0 } },
				},
				{
					association: db.lotteries.associations.draws,
					where: { customerId },
					required: false,
				},
			],
		});

		if (!lottery) {
			throw new Error(`lottery ${lotteryId} does not exist`);
		}

		if (!lottery.lotteryPrizes?.length) {
			throw new AppError(BAD_REQUEST, '賞品はすでに上限に達したため、これ以上の配布はできません。');
		}

		if (lottery.draws && lottery.draws.length > 0) {
			throw new AppError(BAD_REQUEST, 'このくじ引きにすでに参加しています。');
		}

		if (!moment().isBetween(lottery.start, lottery.end)) {
			throw new AppError(BAD_REQUEST, 'くじ引きは期間外です');
		}

		const prizeId = await LotteryService.chanceDrawLottery(lottery.lotteryPrizes);
		const prize = lottery.lotteryPrizes.find((p) => (p.prizeId as number) == prizeId);
		if (prize == undefined) throw new Error(`prize ${prizeId} could not find after drawing`);

		await Promise.all([
			//create draw
			db.draws.create({
				customerId: customerId,
				lotteryId: lotteryId,
				prizeId: prize.prizeId,
				drawDate: new Date(),
			}),
			//deduct remaining prizes
			prize.isMiss
				? Promise.resolve('ok')
				: db.lotteryPrizes.decrement('remainingAmount', {
						by: 1,
						where: { prizeId: prize.prizeId },
				  }),
		]);
		return prize.toJSON() as LotteryPrizeModel;
	}
	static async chanceDrawLottery(lotteryPrizes?: LotteryPrizeModel[]): Promise<number> {
		if (lotteryPrizes == undefined) throw new Error('no prize choices');
		return chance.weighted(
			lotteryPrizes.map((p) => p.prizeId),
			lotteryPrizes.map((p) => parseFloat(p.weight)),
		);
	}
	static async browseLotteries(params: lotteriesSearchParams) {
		const result = await db.lotteries.findAndCountAll({
			limit: params.pp as number,
			offset: ((params.p as number) - 1) * (params.pp as number),
			order: [[col(params.sortKey), params.sort as string]],
		});
		return {
			pp: params.pp,
			p: params.p,
			sort: params.sort,
			sortKey: params.sortKey,
			...result,
		};
	}
	static listLotteries() {
		return db.lotteries.findAll({
			where: {
				start: { [Op.lt]: new Date() },
				end: { [Op.gt]: new Date() },
			},
			include: [
				{
					association: db.lotteries.associations.lotteryPrizes,
					attributes: ['name', 'remainingAmount'],
					include: [
						{
							association: db.lotteryPrizes.associations.Coupon,
						},
					],
				},
			],
		});
	}
	static async createLottery({
		title,
		description,
		start,
		end,
		picUrl,
	}: {
		title: string;
		description: string;
		start: string;
		end: string;
		picUrl?: string;
	}) {
		return db.lotteries.create({
			title: title,
			description: description,
			start: moment(start).toDate(),
			end: moment(end).toDate(),
			picUrl: picUrl ?? null,
		});
	}
	static async updateLottery({
		lotteryId,
		title,
		description,
		start,
		end,
		picUrl,
	}: {
		lotteryId: number;
		title: string;
		description: string;
		start: string;
		end: string;
		picUrl?: string;
	}) {
		const lottery = await db.lotteries.findByPk(lotteryId);
		if (lottery == null) throw new Error(`lottery ${lotteryId} does not exist`);

		const oldPicUrl = lottery.picUrl;
		lottery.set({
			title: title,
			description: description,
			start: moment(start).toDate(),
			end: moment(end).toDate(),
			picUrl: picUrl ? picUrl : lottery.picUrl,
		});
		if (picUrl != null && picUrl != oldPicUrl) {
			await FileUtility.deleteFile(`public/uploads/${oldPicUrl}`, (err) => {
				writeLog({ msg: 'delete lottery file', err: err }, 'error');
			});
		}
		return await lottery.save();
	}
	static async deleteLotteryDraw(lotteryId: number, drawId: number) {
		const [lottery, draw] = await Promise.all([
			db.lotteries.findByPk(lotteryId) as Promise<LotteryModel>,
			db.draws.findOne({
				where: { drawId: drawId, lotteryId: lotteryId },
			}),
		]);
		if (lottery == null) throw new Error(`lottery ${lotteryId} does not exist`);
		if (draw == null) throw new Error(`draw ${drawId} does not exist`);

		return await Promise.all([
			db.lotteryPrizes.increment('remainingAmount', {
				by: 1,
				where: { prizeId: draw.prizeId, lotteryId: lotteryId },
			}),
			db.draws.destroy({ where: { drawId: draw.drawId } }),
		]);
	}
	static async deleteLottery(lotteryId: number) {
		const lottery = await db.lotteries.findByPk(lotteryId);
		if (lottery == null) throw new Error(`lottery ${lotteryId} does not exist`);

		const picName = lottery.picUrl;
		await lottery.destroy();
		return picName;
	}
	static async getLotteryPrizes(lotteryId: number, params: searchParams) {
		return db.lotteryPrizes.findAndCountAll({
			where: { lotteryId: lotteryId },
			limit: params.pp as number,
			offset: ((params.p as number) - 1) * (params.pp as number),
			order: [[col(params.sortKey), params.sort as string]],
		});
	}
	static async addLotteryPrize(params: CreationAttributes<LotteryPrizeModel>) {
		return db.lotteryPrizes.create(params);
	}
	static async updateLotteryPrize(params: CreationAttributes<LotteryPrizeModel>) {
		const prize = await db.lotteryPrizes.findOne({
			where: { prizeId: params.prizeId, lotteryId: params.lotteryId },
		});
		if (prize === null) throw new Error(`prize ${params.prizeId} of lottery ${params.lotteryId} not found`);

		if (params.couponId !== undefined) prize.set({ couponId: params.couponId });

		if (params.name !== undefined) prize.set({ name: params.name });

		if (!isNaN(params.remainingAmount as number)) prize.set({ remainingAmount: params.remainingAmount });

		if (!isNaN(parseFloat(params.weight) as number)) prize.set({ weight: params.weight });

		if (params.isMiss !== undefined) prize.set({ isMiss: params.isMiss });

		if (params.picUrl !== undefined) prize.set({ picUrl: params.picUrl });

		if (prize.changed()) return prize.save();
		else return prize;
	}
	static async deleteLotteryPrize({ lotteryId, prizeId }: { lotteryId: number; prizeId: number }) {
		return db.lotteryPrizes.destroy({
			where: { prizeId: prizeId, lotteryId: lotteryId },
		});
	}
}
