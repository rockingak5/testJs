import {
	Model,
	Association,
	Sequelize,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	NonAttribute,
	ForeignKey,
} from 'sequelize';
import { Member } from './memberModel';
import { Surveys } from './surveyModel';
import { DATABASE_TABLE_NAME } from '~config';

export class MemberSurveyReward extends Model<
	InferAttributes<MemberSurveyReward, { omit: 'Member' | 'Surveys' }>,
	InferCreationAttributes<MemberSurveyReward, { omit: 'Member' | 'Surveys' }>
> {
	//TIMESTAMPS
	declare memberSurveyRewardId: CreationOptional<number>;

	declare memberId: ForeignKey<Member['memberId']>;
	declare surveyId: ForeignKey<Surveys['surveyId']>;
	declare surveyRewardCode: string | null;

	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	//ASSOCIATIONS
	declare Member?: NonAttribute<Member>;
	declare Surveys?: NonAttribute<Surveys>;

	declare static associations: {
		Member: Association<MemberSurveyReward, Member>;
		Surveys: Association<MemberSurveyReward, Surveys>;
	};
	static initClass = (sequelize: Sequelize) =>
		MemberSurveyReward.init(
			{
				memberSurveyRewardId: { type: DataTypes.INTEGER({ unsigned: true }), primaryKey: true, autoIncrement: true },
				surveyRewardCode: { type: DataTypes.STRING, allowNull: false },

				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: DATABASE_TABLE_NAME.MEMBER_SURVEY_REWARD,
				modelName: 'memberSurveyReward',
				name: {
					singular: 'memberSurveyReward',
					plural: DATABASE_TABLE_NAME.MEMBER_SURVEY_REWARD,
				},
			},
		);
}
