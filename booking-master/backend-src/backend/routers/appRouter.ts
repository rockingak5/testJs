import { Router } from 'express';
import {} from '../controllers/liffController';
import { surveyController, surveyRecordController, surveyTemplateController } from '../controllers';
import { uploadImage, uploadSurvey } from '../middlewares/multerMiddleware';
import { multerFileEncodingFixer } from '../middlewares/multerFileEncodeFixMiddleware';

const router = Router();

router.post('/surveys', uploadSurvey.any(), surveyController.createSurveys);
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
router.post(
	'/surveyRecords',
	uploadImage.array('photos', 10),
	multerFileEncodingFixer('photos', true),
	surveyRecordController.createSurveyRecord,
);

router.get('/surveyRecords/:rcId', surveyRecordController.getSurveyRecordById);
router.post('/surveyRecords/check', surveyRecordController.checkSurveyRecord);
router.put('/surveyRecords/:rcId', surveyRecordController.updateSurveyRecordById);
router.delete('/surveyRecords/:rcId', surveyRecordController.deleteSurveyRecordById);
router.get(
	'/surveyRecords/total/:surveyId',
	surveyRecordController.getAllSurveyRecordsWithPaginationBylineUserIdAndsurveyId,
);
router.get('/surveyRecords/sum/:surveyId', surveyRecordController.getAllSurveyRecordsBylineUserIdAndsurveyId);
export { router };
