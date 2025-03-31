import { Router } from 'express';
import { RESPONSE_SUCCESS } from '../config';
import { checkSession, checkLineProfile } from '../middlewares/authMiddleware';
import { errorLogger, errorResponder } from '../middlewares/errorMiddleware';
import { AuthenticationController, ManagerController, SystemSettingController } from '../controllers';
import { router as MasterRouter } from './masterRouter';
import { router as LiffRouter } from './liffRouter';
import { router as LineRouter } from './lineRouter';
import { router as AppRouter } from './appRouter';
import { router as WebhookRouter } from './webhookRouter';
const router = Router();

// router.use('/line', LineWebhook);
router.post('/login', AuthenticationController.Login);
router.get('/logout', AuthenticationController.Logout);
router.get('/sess', checkSession, (req, res) => {
	res.sendStatus(RESPONSE_SUCCESS);
});
router.get('/auth', checkSession, ManagerController.checkAuthenticatedUser);
router.get('/favicon', SystemSettingController.getFavicon);
router.get('/logo', SystemSettingController.getLogo);
router.get('/store/pic', SystemSettingController.getStorePic);
router.get('/settings', SystemSettingController.getPublicSettings);

router.use('/m', checkSession, MasterRouter);
router.use('/line', LineRouter);
router.use('/app', AppRouter);
router.use('/liff', checkLineProfile, LiffRouter);
router.use('/webhook', WebhookRouter);
router.use(errorLogger, errorResponder);
export { router };
