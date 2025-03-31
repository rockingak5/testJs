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
import { Member } from './memberModel';
import { CampaignQuestion } from './campaignQuestionModel';
export class CampaignAnswer extends Model<
	InferAttributes<CampaignAnswer, { omit: 'CampaignQuestion' | 'Member' }>,
	InferCreationAttributes<CampaignAnswer, { omit: 'CampaignQuestion' | 'Member' }>
> {
	//ATTRIBUTES
	declare campaignAnswerId: CreationOptional<number>;
	declare campaignQuestionId: ForeignKey<CampaignQuestion['campaignQuestionId'] | null>;
	declare memberId: ForeignKey<Member['memberId'] | null>;
	declare contents: string;
	//ASSOCIATIONS
	declare CampaignQuestion?: NonAttribute<CampaignQuestion>;
	declare Member?: NonAttribute<Member>;
	declare static associations: {
		CampaignQuestion: Association<CampaignQuestion, CampaignAnswer>;
		Member: Association<Member, CampaignAnswer>;
	};
	static initClass = (sequelize: Sequelize) =>
		CampaignAnswer.init(
			{
				campaignAnswerId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					primaryKey: true,
					autoIncrement: true,
				},
				contents: { type: DataTypes.STRING, allowNull: false },
			},
			{
				sequelize: sequelize,
				timestamps: false,
				tableName: 'campaignAnswers',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'CampaignAnswer',
					plural: 'campaignAnswers',
				},
			},
		);
}
