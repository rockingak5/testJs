import {
	Sequelize,
	Model,
	Association,
	DataTypes,
	CreationOptional,
	InferAttributes,
	InferCreationAttributes,
	NonAttribute,
	ForeignKey,
} from 'sequelize';
import { CampaignAnswer } from './campaignAnswerModel';
import { CampaignChoice } from './campaignChoiceModel';
import { Campaign } from './campaignModel';
export class CampaignQuestion extends Model<
	InferAttributes<CampaignQuestion, { omit: 'campaignAnswers' | 'campaignChoices' | 'Campaign' }>,
	InferCreationAttributes<CampaignQuestion, { omit: 'campaignAnswers' | 'campaignChoices' | 'Campaign' }>
> {
	//ATTRIBUTES
	declare campaignQuestionId: CreationOptional<number>;
	declare campaignId: ForeignKey<Campaign['campaignId'] | null>;
	declare contents: string;
	declare showOrder: CreationOptional<number>;

	declare type?: CreationOptional<string>;
	declare required?: boolean;
	//ASSOCIATIONS
	declare campaignAnswers?: NonAttribute<CampaignAnswer[]>;
	declare campaignChoices?: NonAttribute<CampaignChoice[]>;
	declare Campaign?: NonAttribute<Campaign>;
	declare static associations: {
		campaignAnswers: Association<CampaignAnswer, CampaignQuestion>;
		campaignChoices: Association<CampaignChoice, CampaignQuestion>;
		Campaign: Association<Campaign, CampaignQuestion>;
	};
	static initClass = (sequelize: Sequelize) =>
		CampaignQuestion.init(
			{
				campaignQuestionId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					primaryKey: true,
					autoIncrement: true,
				},
				contents: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
				type: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				required: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'campaignQuestions',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CampaignQuestion',
					plural: 'campaignQuestions',
				},
			},
		);
}
