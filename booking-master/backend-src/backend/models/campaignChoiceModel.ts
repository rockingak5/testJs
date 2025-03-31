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
import { CampaignQuestion } from './campaignQuestionModel';
import { CustomerRegistration } from './customerRegistrationModel';
export class CampaignChoice extends Model<
	InferAttributes<CampaignChoice, { omit: 'CampaignQuestion' | 'CustomerRegistration' }>,
	InferCreationAttributes<CampaignChoice, { omit: 'CampaignQuestion' | 'CustomerRegistration' }>
> {
	//ATTRIBUTES
	declare campaignChoiceId: CreationOptional<number>;
	declare campaignQuestionId?: ForeignKey<CampaignQuestion['campaignQuestionId'] | null>;
	declare customerRegistrationId?: ForeignKey<CustomerRegistration['customerRegistrationId'] | null>;

	declare contents: string;
	declare showOrder: number;
	declare type?: CreationOptional<string>;

	//ASSOCIATIONS
	declare CampaignQuestion?: NonAttribute<CampaignQuestion>;
	declare CustomerRegistration?: NonAttribute<CampaignQuestion>;
	declare static associations: {
		CampaignQuestion: Association<CampaignQuestion, CampaignChoice>;
		CustomerRegistration: Association<CustomerRegistration, CampaignChoice>;
	};
	static initClass = (sequelize: Sequelize) =>
		CampaignChoice.init(
			{
				campaignChoiceId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					primaryKey: true,
					autoIncrement: true,
				},
				contents: { type: DataTypes.STRING, allowNull: false },
				showOrder: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
				type: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'campaignChoices',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CampaignChoice',
					plural: 'campaignChoices',
				},
			},
		);
}
