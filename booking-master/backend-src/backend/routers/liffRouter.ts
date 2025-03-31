import { Router } from 'express';

import {
	CampaignQuestionController,
	LiffController,
	CustomerRegistrationController,
	surveyController,
	surveyTemplateController,
	surveyRecordController,
	OccurrenceController,
} from '../controllers';
import { multerFileEncodingFixer } from '../middlewares/multerFileEncodeFixMiddleware';
import { memberUploadImage } from '../middlewares/multerMiddleware';
import { router as LotteryRouter } from './liff-lottery.routes';
import { sendMessageToSpectators } from '../middlewares/sendMessageToSpectators';

const router = Router();

router.post('/personal', LiffController.setPersonalInfo);
router.get('/personal', LiffController.getPersonalInfo);

router.post(
	'/personal-new',
	memberUploadImage.array('photos', 10),
	multerFileEncodingFixer('photos', true),
	LiffController.setPersonalInfoNew,
	sendMessageToSpectators,
);

router.patch(
	'/personal',
	memberUploadImage.array('photos', 10),
	multerFileEncodingFixer('photos', true),
	LiffController.setPersonalInfoNew,
);

router.get('/categories', LiffController.browseCategories);
router.get('/categories/:categoryId', LiffController.detailCategory_Member);

router.get('/occurrences/:occurrenceId/purchase', OccurrenceController.purchase);

router.get('/occasions', LiffController.browseOccasion_Member);
router.get('/occasions/:occasionId', LiffController.detailOccasion_Member);

router.post('/registerForEvent', LiffController.registerForEvent);

router.get('/registrations', LiffController.getRegistrations);
router.get('/registrations/:registrationId', LiffController.getRegistration);
router.delete('/registrations/:registrationId', LiffController.cancelRegistration);

// campaigns new
router.get('/campaigns', LiffController.browseCampaigns);
router.get('/campaigns/:campaignId', LiffController.detailCampaignMember);
router.post(
	'/campaign-registerForEvent',
	memberUploadImage.array('photos', 10),
	multerFileEncodingFixer('photos', true),
	LiffController.registerForCampaignEvent,
);
router.get('/campaigns-registrations', LiffController.getCampaignRegistrations);
router.get('/campaign-registrations/:registrationId', LiffController.getCampaignRegistration);
router.get('/campaigns-gifts', LiffController.browseGiftMember);
router.get('/campaigns/questions', CampaignQuestionController.listQuestions);
router.post('/campaigns/answers', LiffController.applyToCampaign);

router.get('/campaigns/questions/:campaignId', CampaignQuestionController.listCampaignQuestions);

router.get('/settings-customer-registrations', CustomerRegistrationController.listCustomerRegistrations);

// attended
router.put('/registrations/update-attended/:registrationId', LiffController.memberUpdateRegistrationAttended);

//survey
router.post('/surveys', surveyController.createSurveys);
router.get('/surveys/:surveyId', surveyController.getSurveyBySurveyId);
router.put('/surveys/:surveyId', surveyController.updateSurveyById);
router.delete('/surveys/:surveyId', surveyController.delSurveyBySurveyId);
router.get('/surveys', surveyController.getAllSurveyWithPagination);
// Survey Template Routes
router.post('/surveyTemplates', surveyTemplateController.createSurveyTemplate);
router.get('/surveyTemplates/:tpId', surveyTemplateController.getSurveyTemplateById);
router.put('/surveyTemplates/:tpId', surveyTemplateController.updateSurveyTemplateById);
router.delete('/surveyTemplates/:tpId', surveyTemplateController.deleteSurveyTemplateById);
router.get('/surveyTemplates/quest/:surveyId', surveyTemplateController.getAllQuestionTemplate);
router.put('/surveyTemplates/quest/:surveyId', surveyTemplateController.updateSurveyTemplateOrder);

// Survey Record Routes
router.post('/surveyRecords', surveyRecordController.createSurveyRecord);
router.get('/surveyRecords/:rcId', surveyRecordController.getSurveyRecordById);
router.put('/surveyRecords/:rcId', surveyRecordController.updateSurveyRecordById);
router.delete('/surveyRecords/:rcId', surveyRecordController.deleteSurveyRecordById);
// router.get('/surveyRecords', surveyRecordController.getAllSurveyRecordsWithPagination);

router.use('/lotteries', LotteryRouter);

// router.get('/lotteries', LotteryController.listLotteries)
// router.post('/lotteries/:lotteryId', LotteryController.drawLottery)
// router.get('/lotteries/:lotteryId', LotteryController.lotteryDetails)

export { router };
