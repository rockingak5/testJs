import { AUTH_LEVELS, dbConfig } from '../config';
import { Sequelize } from 'sequelize';
import { Audience } from './audienceModel';
import { Member } from './memberModel';
import { Manager } from './managerModel';
import { Occasion } from './occasionModel';
import { Occurrence } from './occurrenceModel';
import { Registration } from './registrationModel';
import { Richmenu } from './richmenuModel';
import { SystemSetting } from './systemSettingModel';
import { Chat } from './chatModel';
import { Template } from './templateModel';
import { CategoryDetail } from './categoryDetailModel';
import { Category } from './categoryModel';
import { CategoryArea } from './categoryAreaModel';
import { OccasionDetail } from './occasionDetailModel';
import { OccasionImage } from './occasionImageModel';
import { CategoryImage } from './categoryImageModel';
import { CategoryTag } from './categoryTagModel';
import { CampaignQuestion } from './campaignQuestionModel';
import { CampaignChoice } from './campaignChoiceModel';
import { CampaignAnswer } from './campaignAnswerModel';
import { Reminder } from './reminderModel';
import { Spectator } from './spectatorModel';
import { Session } from './sessionModel';
import { CategoryMessage } from './categoryMessageModel';
import { CustomerRegistration } from './customerRegistrationModel';
import { Campaign } from './campaignModel';
import { Gift } from './giftModel';
import { MemberGift } from './memberGiftModel';
import { Surveys } from './surveyModel';
import { SurveyTemplate } from './surveyTemplateModel';
import { SurveyRecord } from './surveyRecordModel';
import { Transaction } from './transactionModel';
import { CategoryCancelCondition } from './categoryCancelConditions';
import { OccasionCancelCondition } from './occasionCancelConditionsModel';
import { CategoryMessageDetail } from './categoryMessageDetail';
import { LotteryModel } from './lottery.model';
import { LotteryPrizeModel } from './lotteryPrize.model';
import { CouponModel } from './coupon.model';
import { DrawModel } from './draw.model';
import { MemberSurveyReward } from './memberSurveyRewardModel';
import { MemberFriendAdded } from './memberFriendAdded';

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
	host: dbConfig.HOST,
	dialect: dbConfig.DIALECT as 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | undefined,
	port: dbConfig.PORT,
	pool: {
		max: dbConfig.POOL.max,
		min: dbConfig.POOL.min,
		acquire: dbConfig.POOL.acquire,
		idle: dbConfig.POOL.idle,
	},
	timezone: '+09:00',
	logging: dbConfig.LOGGING,
	logQueryParameters: true,
});

Audience.initClass(sequelize);
Manager.initClass(sequelize, { defaultAuthLevel: AUTH_LEVELS.manager });
Member.initClass(sequelize);
CategoryArea.initClass(sequelize);
CategoryDetail.initClass(sequelize);
CategoryMessage.initClass(sequelize);
CategoryImage.initClass(sequelize);
CategoryTag.initClass(sequelize);
Category.initClass(sequelize);
Chat.initClass(sequelize);
OccasionDetail.initClass(sequelize);
OccasionImage.initClass(sequelize);
Occasion.initClass(sequelize);
Gift.initClass(sequelize);
Occurrence.initClass(sequelize);
Registration.initClass(sequelize);
Reminder.initClass(sequelize);
Richmenu.initClass(sequelize);
Session.initClass(sequelize);
SystemSetting.initClass(sequelize);
Template.initClass(sequelize);
CampaignQuestion.initClass(sequelize);
CampaignChoice.initClass(sequelize);
CampaignAnswer.initClass(sequelize);
Spectator.initClass(sequelize);
CustomerRegistration.initClass(sequelize);
MemberGift.initClass(sequelize);
Surveys.initClass(sequelize);
SurveyTemplate.initClass(sequelize);
SurveyRecord.initClass(sequelize);

Campaign.initClass(sequelize);
Transaction.initClass(sequelize);
CategoryCancelCondition.initClass(sequelize);
OccasionCancelCondition.initClass(sequelize);
CategoryMessageDetail.initClass(sequelize);
CouponModel.initClass(sequelize);
LotteryModel.initClass(sequelize);
DrawModel.initClass(sequelize);
LotteryPrizeModel.initClass(sequelize);
MemberSurveyReward.initClass(sequelize);
MemberFriendAdded.initClass(sequelize);

Reminder.belongsTo(Member, {
	foreignKey: 'memberId',
	onDelete: 'SET NULL',
	constraints: false,
	foreignKeyConstraint: false,
});
Reminder.belongsTo(Registration, {
	foreignKey: 'registrationId',
	onDelete: 'SET NULL',
	constraints: false,
	foreignKeyConstraint: false,
});
Registration.belongsTo(Member, {
	foreignKey: 'memberId',
	onDelete: 'SET NULL',
	constraints: false,
	foreignKeyConstraint: false,
});
Registration.belongsTo(Occurrence, { foreignKey: 'occurrenceId', onDelete: 'CASCADE' });
Registration.belongsTo(Occasion, {
	foreignKey: 'occasionId',
	onDelete: 'SET NULL',
	constraints: false,
	foreignKeyConstraint: false,
});
Registration.belongsTo(Gift, {
	foreignKey: 'giftId',
	onDelete: 'SET NULL',
	constraints: false,
	foreignKeyConstraint: false,
});
Registration.belongsTo(Category, {
	foreignKey: 'categoryId',
	onDelete: 'SET NULL',
	constraints: false,
	foreignKeyConstraint: false,
});
Registration.belongsTo(Campaign, {
	foreignKey: 'campaignId',
	onDelete: 'SET NULL',
	constraints: false,
	foreignKeyConstraint: false,
});
Chat.belongsTo(Member, { foreignKey: 'memberId', onDelete: 'CASCADE' });
Spectator.belongsTo(Member, { foreignKey: 'memberId', onDelete: 'CASCADE' });
OccasionDetail.belongsTo(Occasion, { foreignKey: 'occasionId', onDelete: 'CASCADE' });
OccasionImage.belongsTo(Occasion, { foreignKey: 'occasionId', onDelete: 'CASCADE' });
Occurrence.belongsTo(Occasion, { foreignKey: 'occasionId', onDelete: 'CASCADE' });

OccasionDetail.belongsTo(Gift, { foreignKey: 'giftId', onDelete: 'CASCADE' });
OccasionImage.belongsTo(Gift, { foreignKey: 'giftId', onDelete: 'CASCADE' });
// CategoryTag.belongsTo(Gift, { foreignKey: 'giftId', onDelete: 'CASCADE' })

Occurrence.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
CategoryArea.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
CategoryDetail.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
CategoryMessage.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
CategoryImage.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
CategoryTag.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
Occurrence.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'SET NULL' });
Occasion.belongsTo(Category, { foreignKey: 'categoryId' });

Occasion.hasMany(OccasionDetail, { foreignKey: 'occasionId' });
Occasion.hasMany(OccasionImage, { foreignKey: 'occasionId' });
Occasion.hasMany(Occurrence, { foreignKey: 'occasionId' });
Occasion.hasMany(Registration, { foreignKey: 'occasionId' });

Gift.hasMany(OccasionDetail, { foreignKey: 'giftId' });
Gift.hasMany(OccasionImage, { foreignKey: 'giftId' });
Gift.hasMany(Registration, { foreignKey: 'giftId' });
// Gift.hasMany(CategoryTag, { foreignKey: 'giftId' })

Category.hasMany(CategoryArea, { foreignKey: 'categoryId' });
Category.hasMany(CategoryDetail, { foreignKey: 'categoryId' });
Category.hasMany(CategoryMessage, { foreignKey: 'categoryId' });
Category.hasMany(CategoryImage, { foreignKey: 'categoryId' });
Category.hasMany(CategoryTag, { foreignKey: 'categoryId' });
Category.hasMany(Occasion, { foreignKey: 'categoryId' });
Category.hasMany(Occurrence, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
Category.hasMany(Registration, { foreignKey: 'categoryId' });

Occurrence.belongsTo(Campaign, { foreignKey: 'campaignId', onDelete: 'CASCADE' });
CategoryArea.belongsTo(Campaign, { foreignKey: 'campaignId', onDelete: 'CASCADE' });
CategoryDetail.belongsTo(Campaign, { foreignKey: 'campaignId', onDelete: 'CASCADE' });
CategoryImage.belongsTo(Campaign, { foreignKey: 'campaignId', onDelete: 'CASCADE' });
CategoryTag.belongsTo(Campaign, { foreignKey: 'campaignId', onDelete: 'CASCADE' });
Occurrence.belongsTo(Campaign, { foreignKey: 'campaignId', onDelete: 'SET NULL' });
CampaignQuestion.belongsTo(Campaign, { foreignKey: 'campaignId', onDelete: 'SET NULL' });
Gift.belongsTo(Campaign, { foreignKey: 'campaignId' });

Campaign.hasMany(CategoryArea, { foreignKey: 'campaignId' });
Campaign.hasMany(CategoryDetail, { foreignKey: 'campaignId' });
Campaign.hasMany(CategoryImage, { foreignKey: 'campaignId' });
Campaign.hasMany(CategoryTag, { foreignKey: 'campaignId' });
Campaign.hasMany(Gift, { foreignKey: 'campaignId' });
Campaign.hasMany(Occurrence, { foreignKey: 'campaignId', onDelete: 'CASCADE' });
Campaign.hasMany(Registration, { foreignKey: 'campaignId' });
Campaign.hasMany(CampaignQuestion, { foreignKey: 'campaignId' });

Registration.hasMany(Reminder, { foreignKey: 'registrationId' });
Member.hasMany(Chat, { foreignKey: 'memberId' });
Member.hasMany(Registration, { foreignKey: 'memberId' });
Member.hasMany(Reminder, { foreignKey: 'memberId' });
Member.hasOne(Spectator, { foreignKey: 'memberId' });
Occurrence.hasMany(Registration, { foreignKey: 'occurrenceId' });

CampaignAnswer.belongsTo(Member, { foreignKey: 'memberId', onDelete: 'SET NULL' });
CampaignAnswer.belongsTo(CampaignQuestion, { foreignKey: 'campaignQuestionId', onDelete: 'SET NULL' });
CampaignChoice.belongsTo(CampaignQuestion, { foreignKey: 'campaignQuestionId', onDelete: 'CASCADE' });
CampaignChoice.belongsTo(CustomerRegistration, { foreignKey: 'customerRegistrationId', onDelete: 'CASCADE' });
Member.hasMany(CampaignAnswer, { foreignKey: 'memberId' });
CampaignQuestion.hasMany(CampaignAnswer, { foreignKey: 'campaignQuestionId' });
CampaignQuestion.hasMany(CampaignChoice, { foreignKey: 'campaignQuestionId' });

CustomerRegistration.hasMany(CampaignChoice, { foreignKey: 'customerRegistrationId' });

// Member.belongsToMany(Gift, { through: 'memberGifts', foreignKey: 'memberId', targetKey: 'giftId' })
// Gift.belongsToMany(Member, { through: 'memberGifts', foreignKey: 'giftId', targetKey: 'memberId' })

Member.hasMany(MemberGift, { foreignKey: 'memberId' });
Gift.hasMany(MemberGift, { foreignKey: 'giftId' });
Registration.hasMany(MemberGift, { foreignKey: 'registrationId' });
MemberGift.belongsTo(Member, { foreignKey: 'memberId', onDelete: 'SET NULL' });
MemberGift.belongsTo(Gift, { foreignKey: 'giftId', onDelete: 'SET NULL' });
MemberGift.belongsTo(Registration, { foreignKey: 'registrationId', onDelete: 'SET NULL' });

Member.belongsToMany(Occurrence, {
	through: { model: Transaction, unique: false },
	foreignKey: 'memberId',
	as: 'MemberOccurrenceTransactions',
});
Occurrence.belongsToMany(Member, {
	through: { model: Transaction, unique: false },
	foreignKey: 'occurrenceId',
	as: 'MemberOccurrenceTransactions',
});
Transaction.belongsTo(Member, { foreignKey: 'memberId', onDelete: 'CASCADE' });
Transaction.belongsTo(Occurrence, { foreignKey: 'occurrenceId', onDelete: 'CASCADE' });
Transaction.belongsTo(Registration, {
	foreignKey: {
		allowNull: true,
		name: 'registrationId',
	},
	onDelete: 'CASCADE',
});
Registration.hasMany(Transaction, {
	foreignKey: {
		allowNull: true,
		name: 'registrationId',
	},
});
CategoryCancelCondition.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
Category.hasMany(CategoryCancelCondition, { foreignKey: 'categoryId' });
OccasionCancelCondition.belongsTo(Occasion, { foreignKey: 'occasionId', onDelete: 'CASCADE' });
Occasion.hasMany(OccasionCancelCondition, { foreignKey: 'occasionId' });

CategoryMessageDetail.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'CASCADE' });
Category.hasOne(CategoryMessageDetail, { foreignKey: 'categoryId' });

CategoryMessageDetail.belongsTo(Occasion, { foreignKey: 'occasionId', onDelete: 'CASCADE' });
Occasion.hasOne(CategoryMessageDetail, { foreignKey: 'occasionId' });

DrawModel.belongsTo(Member, {
	foreignKey: {
		field: 'customerId',
		name: 'memberId',
	},
	onDelete: 'CASCADE',
});
DrawModel.belongsTo(LotteryModel, { foreignKey: 'lotteryId' });
DrawModel.belongsTo(LotteryPrizeModel, { foreignKey: 'prizeId' });
LotteryPrizeModel.hasMany(DrawModel, { foreignKey: 'prizeId' });
LotteryPrizeModel.belongsTo(LotteryModel, { foreignKey: 'lotteryId' });
LotteryPrizeModel.belongsTo(CouponModel, { foreignKey: 'couponId' });
LotteryModel.hasMany(LotteryPrizeModel, { foreignKey: 'lotteryId' });
LotteryModel.hasMany(DrawModel, { foreignKey: 'lotteryId' });
Member.hasMany(DrawModel, {
	foreignKey: {
		field: 'customerId',
		name: 'memberId',
	},
});
CouponModel.hasMany(LotteryPrizeModel, { foreignKey: 'couponId' });

Member.hasMany(SurveyRecord, { foreignKey: 'lineUserId', sourceKey: 'lineId', onDelete: 'CASCADE' });
Surveys.hasMany(SurveyRecord, { foreignKey: 'surveyId', onDelete: 'CASCADE' });
SurveyTemplate.hasMany(SurveyRecord, { foreignKey: 'tpId', onDelete: 'CASCADE' });
Surveys.hasMany(SurveyTemplate, { foreignKey: 'surveyId', onDelete: 'CASCADE' });
SurveyTemplate.belongsTo(Surveys, { foreignKey: 'surveyId', onDelete: 'CASCADE' });
SurveyRecord.belongsTo(SurveyTemplate, { foreignKey: 'tpId', onDelete: 'CASCADE' });
SurveyRecord.belongsTo(Member, {
	foreignKey: 'lineUserId',
	targetKey: 'lineId',
	onDelete: 'CASCADE',
});

MemberSurveyReward.belongsTo(Member, {
	foreignKey: 'memberId',
	targetKey: 'memberId',
	onDelete: 'CASCADE',
});

Member.hasMany(MemberSurveyReward, {
	foreignKey: 'memberId',
});

MemberSurveyReward.belongsTo(Surveys, {
	foreignKey: 'surveyId',
	targetKey: 'surveyId',
	onDelete: 'CASCADE',
});

Surveys.hasMany(MemberSurveyReward, {
	foreignKey: 'surveyId',
});

const db = {
	sequelize,
	audiences: Audience,
	campaignAnswers: CampaignAnswer,
	campaignChoices: CampaignChoice,
	campaignQuestions: CampaignQuestion,
	categories: Category,
	categoryAreas: CategoryArea,
	categoryDetails: CategoryDetail,
	categoryMessages: CategoryMessage,
	categoryImages: CategoryImage,
	categoryTags: CategoryTag,
	chats: Chat,
	managers: Manager,
	members: Member,
	occasions: Occasion,
	occasionDetails: OccasionDetail,
	occasionImages: OccasionImage,
	occurrences: Occurrence,
	registrations: Registration,
	reminders: Reminder,
	richmenus: Richmenu,
	sessions: Session,
	spectators: Spectator,
	systemSettings: SystemSetting,
	templates: Template,
	customerRegistrations: CustomerRegistration,
	campaigns: Campaign,
	gifts: Gift,
	memberGifts: MemberGift,
	surveys: Surveys,
	surveyRecord: SurveyRecord,
	surveyTemplate: SurveyTemplate,
	transaction: Transaction,
	categoryCancelConditions: CategoryCancelCondition,
	occasionCancelConditions: OccasionCancelCondition,
	categoryMessageDetails: CategoryMessageDetail,
	lotteries: LotteryModel,
	lotteryPrizes: LotteryPrizeModel,
	coupons: CouponModel,
	draws: DrawModel,
	memberSurveyRewardModel: MemberSurveyReward,
	memberFriendAddedModel: MemberFriendAdded,
};

export { db };
