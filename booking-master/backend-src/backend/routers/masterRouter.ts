import { Type } from '@sinclair/typebox';
import { Router } from 'express';
import { validate } from '~middlewares/validator';

import {
	AudienceController,
	CampaignCandidateController,
	CampaignController,
	CampaignQuestionController,
	CategoryController,
	ChatController,
	CouponController,
	CustomerRegistrationController,
	GiftController,
	LotteryController,
	MemberController,
	OccasionController,
	OccurrenceController,
	PrizeController,
	RegistrationController,
	RichmenuController,
	SpectatorController,
	SystemSettingController,
	TemplateController,
	surveyController,
} from '../controllers';
import { multerFileEncodingFixer } from '../middlewares/multerFileEncodeFixMiddleware';
import {
	memberUploadImage,
	richmenuUpload,
	uploadCategoryPic,
	uploadCoupons,
	uploadIco,
	uploadImage,
	uploadLotteries,
	uploadOccasion,
	uploadSurvey,
} from '../middlewares/multerMiddleware';
import { SURVEY_IMAGE_QUESTION_FILE_NAME } from '~config';

const router = Router();

router.get('/dailyStats', CategoryController.statsToday);

router.post(
	'/categories',
	uploadCategoryPic.fields([{ name: 'categoryImages' }]),
	multerFileEncodingFixer('categoryImages', true),
	CategoryController.createCategory,
);
router.get('/categories', CategoryController.browseCategories);
router.get('/categories/areas', CategoryController.listCategoriesAreas);
router.get('/categories/basic', CategoryController.listCategoriesBare);
router.get('/categories/tags', CategoryController.listCategoriesTags);
router.get('/categories/:categoryId', CategoryController.getCategoryDetailed);
router.put('/categories', CategoryController.updateCategoryOrder);
router.put(
	'/categories/:categoryId',
	uploadCategoryPic.fields([{ name: 'categoryImages' }]),
	multerFileEncodingFixer('categoryImages', true),
	CategoryController.updateCategory,
);
router.patch('/categories/batch-update-display', CategoryController.batchUpdateCategories);
router.delete('/categories/:categoryId', CategoryController.deleteCategory);

router.get('/occasions', OccasionController.browseOccasion_Master);
router.get('/occasions/basic', OccasionController.listOccasionBare);
router.get('/occasions/:occasionId', OccasionController.detailOccasion_Master);
router.put('/occasions', OccasionController.updateOccasionOrder);
router.post(
	'/occasions/',
	uploadOccasion.fields([{ name: 'occasionImages' }]),
	multerFileEncodingFixer('occasionImages', true),
	OccasionController.createOccasion,
);
router.put(
	'/occasions/:occasionId',
	uploadOccasion.fields([{ name: 'occasionImages' }]),
	multerFileEncodingFixer('occasionImages', true),
	OccasionController.updateOccasion,
);

router.delete('/occasions/:occasionId', OccasionController.deleteOccasion);

router.get('/occurrences/:occurrenceId', OccurrenceController.getOccurrenceDetailed_Master);
router.put('/occurrences/:occurrenceId', OccurrenceController.updateOccurrence);
router.post('/occurrences', OccurrenceController.editOccurrences);
router.delete('/occurrences', OccurrenceController.bulkDeleteOccurrences);
router.delete('/occurrences/:occurrenceId', OccurrenceController.deleteOccurrence);

router.post('/registrations', RegistrationController.createManualRegistration);
router.post('/registrations/qr', RegistrationController.getConfirmRegistration);
router.post('/registrations/csv', RegistrationController.generateCategoryRegistrationCSV);
router.get('/registrations/:registrationId', RegistrationController.getRegistration);
router.put('/registrations/edit', RegistrationController.updateRegistration);
router.put('/registrations/update-attended', RegistrationController.updateRegistrationAttended);
router.post(
	'/registrations/:registrationId/confirmation',
	validate({
		params: Type.Object({
			registrationId: Type.String(),
		}),
		body: Type.Object({
			actualCompanionCount: Type.Number(),
			actualParticipantCount: Type.Number(),
		}),
	}),
	RegistrationController.confirmRegistration,
);
router.put(
	'/registrations/:registrationId/edit',
	validate({
		params: Type.Object({
			registrationId: Type.String(),
		}),
		body: Type.Object({
			participantCount: Type.Number(),
			companionCount: Type.Number(),
		}),
	}),
	RegistrationController.updateCountRegistration,
);
router.delete('/registrations/:registrationId/cancel', RegistrationController.cancelRegistration);
router.delete('/registrations/:registrationId/delete', RegistrationController.deleteRegistration);

router.post('/campaign-registrations', RegistrationController.createCampaignManualRegistration);
router.get('/campaign-registrations/:campaignId', RegistrationController.getCampaignRegistrations);

// attended
router.get('/attended/:memberId', RegistrationController.getAttended);
router.get('/campaigns-attended/:memberId', RegistrationController.getCampaignsAttended);

router.get('/members/chats/:memberId', ChatController.getChat);
router.post('/members/chats/:memberId', ChatController.replyChat);
router.post('/members/csv', MemberController.generateMemberCSV);
router.get('/members', MemberController.browseMembers);
router.get('/members/list', MemberController.listMembers);
router.put(
	'/members/:memberId',
	memberUploadImage.array('photos', 10),
	multerFileEncodingFixer('photos', true),
	MemberController.updateMember,
);
router.get('/members/:memberId', MemberController.getMember);
router.post('/members/barcode', MemberController.getMemberByBarCode);
router.delete('/members/:memberId', MemberController.deleteMember);

router.get(
	'/members/:memberId/survey-answer-histories',
	validate({
		params: Type.Object({
			memberId: Type.String(),
		}),
	}),
	MemberController.browseSurveyAnswerHistories,
);
router.get(
	'/members/:memberId/lottery-draw-histories',
	validate({
		params: Type.Object({
			memberId: Type.String(),
		}),
	}),
	MemberController.browseLotteryDrawHistories,
);

//SPECTATORS
router.get('/spectators/candidates', SpectatorController.listPossibleSpectators);
router.get('/spectators', SpectatorController.listSpectators);
router.post('/spectators', SpectatorController.bulkEditSpectators);
router.delete('/spectators/:spectatorId', SpectatorController.deleteSpectator);
// Gift
router.get('/gifts/basic', GiftController.listGiftBare);
// router.get('/gifts/tags', GiftController.listGiftTags)
router.get('/gifts/:giftId', GiftController.detailOccasion_Master);
router.get('/campaign-gifts', GiftController.browseGiftMaster);
router.put('/gifts', GiftController.updateGiftOrder);
router.put('/gifts/update', GiftController.updateGift);

router.post(
	'/campaign-gifts/',
	uploadOccasion.fields([{ name: 'occasionImages' }]),
	multerFileEncodingFixer('occasionImages', true),
	GiftController.createCampaignGift,
);
router.put(
	'/campaign-gifts/:giftId',
	uploadOccasion.fields([{ name: 'occasionImages' }]),
	multerFileEncodingFixer('occasionImages', true),
	GiftController.updateCampaignOccasion,
);
router.delete('/gifts/:giftId', GiftController.deleteGift);

//CAMPAIGN
// router.get('/campaigns/candidates', CampaignCandidateController.generateCandidates);
router.post('/campaigns/winners', CampaignCandidateController.generateWinners);
router.post('/campaigns/winners/reset', CampaignCandidateController.resetWinners);
// router.post('/campaigns/winners/csv', CampaignCandidateController.generateCandidatesCSV);

router.get('/campaigns/questions', CampaignQuestionController.listQuestions);
router.post('/campaigns/questions', CampaignQuestionController.createQuestion);
router.put('/campaigns/questions', CampaignQuestionController.updateQuestionOrder);
router.put('/campaigns/questions/:questionId', CampaignQuestionController.updateQuestion);
router.delete('/campaigns/questions/:questionId', CampaignQuestionController.deleteQuestion);

router.post('/campaigns/create-questions', CampaignQuestionController.createQuestionCampaign);
router.get('/campaigns/list-questions/:campaignId', CampaignQuestionController.listCampaignQuestions);

router.post(
	'/campaigns',
	uploadCategoryPic.fields([{ name: 'categoryImages' }]),
	multerFileEncodingFixer('categoryImages', true),
	CampaignController.createCampaign,
);
router.get('/campaigns', CampaignController.browseCampaigns);
// router.get('/campaigns/areas', CampaignController.listCampaignsAreas)
router.get('/campaigns/basic', CampaignController.listCampaignsBare);
router.get('/campaigns/tags', CampaignController.listCampaignsTags);
router.get('/campaigns/:campaignId', CampaignController.getCampaignDetailed);
// router.put('/campaigns', CampaignController.updateCampaignOrder)
router.put(
	'/campaigns/:campaignId',
	uploadCategoryPic.fields([{ name: 'categoryImages' }]),
	multerFileEncodingFixer('categoryImages', true),
	CampaignController.updateCampaign,
);
router.delete('/campaigns/:campaignId', CampaignController.deleteCampaign);
router.post('/campaigns/register-winners', CampaignController.campaignRegisterWinners);
router.post('/campaigns/automatic-register-winners', CampaignController.automaticRegisterWinners);
router.post('/campaigns/reset-winners', RegistrationController.updateIsWin);

// router.get('/campaigns/answers', CampaignController.insignAnswers);
//RICHMENUS
router.get('/richmenus', RichmenuController.browseListRichMenu);
router.post('/richmenus/:richMenuId/publish', RichmenuController.publishRichMenu);
router.post('/richmenus/:richMenuId/unpublish', RichmenuController.unpublishRichMenu);
router.post('/richmenus', richmenuUpload.single('image'), RichmenuController.createRichMenu);
router.patch('/richmenus/:richMenuId', richmenuUpload.single('image'), RichmenuController.updateRichMenu);
router.delete('/richmenus/:richMenuId', RichmenuController.deleteRichMenu);
//SYSTEM SETTINGS
router.get('/settings', SystemSettingController.getSystemSettings);
router.get('/settings/:key', SystemSettingController.getSystemSetting);
router.put('/settings', SystemSettingController.setBulkSystemSettings);
router.put('/settings/:key', SystemSettingController.setSystemSettings);
router.delete('/settings/:key', SystemSettingController.deleteSettings);

router.post('/settings-customer-registration', CustomerRegistrationController.createCustomerRegistration);
router.put('/settings-customer-registrations', CustomerRegistrationController.updateCustomerRegistrationOrder);
router.put(
	'/settings-customer-registration/:customerRegistrationId',
	CustomerRegistrationController.updateCustomerRegistration,
);

router.get(
	'/settings-customer-registrations',
	validate({
		query: Type.Object({
			isDisplayed: Type.Optional(
				Type.Union([
					//
					Type.Literal('true'),
					Type.Literal('false'),
				]),
			),
			isDefault: Type.Optional(
				Type.Union([
					//
					Type.Literal('true'),
					Type.Literal('false'),
				]),
			),
			isAdminDisplayed: Type.Optional(
				Type.Union([
					//
					Type.Literal('true'),
					Type.Literal('false'),
				]),
			),
		}),
	}),
	CustomerRegistrationController.listCustomerRegistrations,
);
router.delete(
	'/settings-customer-registration/:customerRegistrationId',
	CustomerRegistrationController.deleteCustomerRegistration,
);

router.put(
	'/logo',
	uploadImage.single('picUrl'),
	multerFileEncodingFixer('picUrl', false),
	SystemSettingController.setLogo,
);
router.put(
	'/favicon',
	uploadIco.single('picUrl'),
	multerFileEncodingFixer('picUrl', false),
	SystemSettingController.setFavicon,
);
router.put(
	'/store/pic',
	uploadImage.single('picUrl'),
	multerFileEncodingFixer('picUrl', false),
	SystemSettingController.setStorePic,
);
router.delete('/store/pic', SystemSettingController.deleteStorePic);

router.get('/audiences', AudienceController.listAudiences);

router.get('/audiences/members', AudienceController.browseAudienceMembers);
router.post('/audiences/members', AudienceController.createAudienceMember);

router.get('/prizes', PrizeController.browsePrizes);

router.post('/audiences/lotteries', AudienceController.createAudienceLottery);
router.get('/audiences/lotteries', AudienceController.browseAudienceLotteries);
router.get('/audiences/lotteries/:lotteryId/prizes', AudienceController.browseAudienceLotteryPrizes);
router.get('/audiences/lotteries/:lotteryId/draws', AudienceController.browseAudienceLotteryDraws);
router.post('/audiences', AudienceController.createAudience);
router.delete('/audiences/:audienceGroupId', AudienceController.deleteAudience);

router.post('/audiences/events', AudienceController.searchEventAudience);

router.get('/audiences-campaign', AudienceController.listCampaignAudiences);
router.post('/audiences-campaign/find', AudienceController.searchCampaignAudience);
router.post('/audiences-campaign', AudienceController.createCampaignAudience);

router.get('/audiences-survey', AudienceController.browseAudienceSurveys);
router.post('/audiences-survey', AudienceController.createSurveyAudience);
router.delete('/audiences-survey/:audienceGroupId', AudienceController.deleteAudience);
router.get('/audiences-survey/search', AudienceController.searchAudienceSurvey);
router.get('/audiences-survey/survey-options', AudienceController.browseAudienceSurveyOptions);
router.get('/audiences-survey/questions', AudienceController.browseAudienceSurveyQuestions);

router.post('/templates', TemplateController.createTemplate);
router.get('/templates', TemplateController.browseTemplates);
router.get('/templates/:templateId', TemplateController.getTemplate);
router.put('/templates/:templateId', TemplateController.updateTemplate);
router.delete('/templates/:templateId', TemplateController.deleteTemplate);

router.get('/surveys/:surveyId', surveyController.getDetailSurvey);
router.patch('/surveys/:surveyId', uploadSurvey.any(), surveyController.editSurvey);
router.delete('/surveys/:surveyId', surveyController.deleteSurvey);
router.get('/surveys/:surveyId/statistics', surveyController.statisticsSurvey);
router.get('/surveys/:surveyId/statistics/export', surveyController.statisticsSurveyExport);

router.post('/lotteries', uploadLotteries.single('picUrl'), LotteryController.createLottery);
router.get('/lotteries', LotteryController.browseLotteries);
router.get('/lotteries/:lotteryId', LotteryController.getLotteryDetail);
router.get('/lotteries/:lotteryId/winners', LotteryController.getLotteryWinners);
router.put('/lotteries/:lotteryId', uploadLotteries.single('picUrl'), LotteryController.updateLottery);
router.delete('/lotteries/:lotteryId/draws/:drawId', LotteryController.deleteLotteryDraw);
router.delete('/lotteries/:lotteryId', LotteryController.deleteLottery);
router.get('/lotteries/:lotteryId/prizes', LotteryController.getLotteryPrizes);
router.post('/lotteries/:lotteryId/prizes', uploadLotteries.single('picUrl'), LotteryController.createLotteryPrize);
router.put(
	'/lotteries/:lotteryId/prizes/:prizeId',
	uploadLotteries.single('picUrl'),
	LotteryController.updateLotteryPrize,
);
router.delete('/lotteries/:lotteryId/prizes/:prizeId', LotteryController.deleteLotteryPrize);

router.post('/coupons', uploadCoupons.single('picUrl'), CouponController.createCoupon);
router.get('/coupons', CouponController.browseCoupons);
router.get('/coupons/list', CouponController.listCoupons);
router.put('/coupons/:couponId', uploadCoupons.single('picUrl'), CouponController.updateCoupon);
router.delete('/coupons/:couponId', CouponController.deleteCoupon);
router.post(
	'/upload-survey-question-image',
	uploadSurvey.single(SURVEY_IMAGE_QUESTION_FILE_NAME),
	surveyController.uploadSurveyQuestionImage,
);
router.post('/remove-survey-question-image', surveyController.removeSurveyQuestionImage);

export { router };
