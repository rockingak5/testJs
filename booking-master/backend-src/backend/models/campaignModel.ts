import {
	Association,
	CreationOptional,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	Model,
	NonAttribute,
	Sequelize,
} from 'sequelize';
import { CampaignQuestion } from './campaignQuestionModel';
import { CategoryArea } from './categoryAreaModel';
import { CategoryDetail } from './categoryDetailModel';
import { CategoryImage } from './categoryImageModel';
import { CategoryTag } from './categoryTagModel';
import { Occurrence } from './occurrenceModel';
import { Registration } from './registrationModel';
export class Campaign extends Model<
	InferAttributes<
		Campaign,
		{
			omit:
				| 'occurrences'
				| 'registrations'
				| 'categoryDetails'
				| 'categoryImages'
				| 'categoryTags'
				| 'campaignQuestions';
		}
	>,
	InferCreationAttributes<
		Campaign,
		{
			omit:
				| 'occurrences'
				| 'registrations'
				| 'categoryDetails'
				| 'categoryImages'
				| 'categoryTags'
				| 'campaignQuestions';
		}
	>
> {
	//ATTRIBUTES
	declare campaignId: CreationOptional<number>;
	declare title: string;
	declare sub: string;
	declare description: string | null;
	declare campaignText: string | null;
	declare location: string | null;
	declare showOrder: CreationOptional<number>;
	declare isDisplayed: CreationOptional<boolean>;

	declare startRegistration: CreationOptional<Date>;
	declare endRegistration: CreationOptional<Date>;
	declare isMultiEvent: CreationOptional<boolean>;
	declare isMultipleWinners: CreationOptional<boolean>;
	declare isRegisterMultipleTimes: CreationOptional<boolean>;
	declare presentIssueTiming: CreationOptional<Date>;

	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	declare deletedAt: CreationOptional<Date> | null;
	//ASSOCIATIONS
	declare categoryDetails?: NonAttribute<CategoryDetail[]>;
	declare categoryImages?: NonAttribute<CategoryImage[]>;
	declare categoryTags?: NonAttribute<CategoryTag[]>;
	declare occurrences?: NonAttribute<Occurrence[]>;
	declare registrations?: NonAttribute<Registration[]>;
	declare campaignQuestions?: NonAttribute<CampaignQuestion[]>;
	declare static associations: {
		categoryAreas: Association<Campaign, CategoryArea>;
		categoryDetails: Association<Campaign, CategoryDetail>;
		categoryImages: Association<Campaign, CategoryImage>;
		categoryTags: Association<Campaign, CategoryTag>;
		occurrences: Association<Occurrence, Campaign>;
		registrations: Association<Registration, Campaign>;
		campaignQuestions: Association<CampaignQuestion, Campaign>;
	};
	static initClass = (sequelize: Sequelize) =>
		Campaign.init(
			{
				campaignId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				title: { type: DataTypes.STRING, allowNull: false },
				sub: { type: DataTypes.STRING, allowNull: false },
				description: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				campaignText: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				location: { type: DataTypes.STRING(1000), allowNull: true, defaultValue: null },
				isDisplayed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
				showOrder: { type: DataTypes.SMALLINT, allowNull: false, defaultValue: 0 },
				presentIssueTiming: {
					type: DataTypes.DATE,
					allowNull: false,
				},

				isMultiEvent: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				startRegistration: { type: DataTypes.DATE, allowNull: true },
				endRegistration: { type: DataTypes.DATE, allowNull: true },
				isMultipleWinners: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
				isRegisterMultipleTimes: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },

				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
				deletedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: true,
				tableName: 'campaigns',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'Campaign',
					plural: 'campaigns',
				},
			},
		);
}
