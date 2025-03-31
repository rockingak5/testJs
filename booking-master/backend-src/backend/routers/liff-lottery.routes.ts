import { Router } from 'express';
import { LotteryController } from '../controllers/lottery.controller';

const router = Router();

router.get('/', LotteryController.listLotteries);
// router.get('/:lotteryId/draw', LotteryController.getLotteryInfo);
router.post('/:lotteryId', LotteryController.drawLottery);
router.get('/:lotteryId', LotteryController.lotteryDetails);

export { router };
