import { db } from '~models';

export const browsePrizes = () => {
	return db.lotteryPrizes.findAll({
		attributes: [
			//
			['prizeId', 'id'],
			'name',
		],
	});
};
