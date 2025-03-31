import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';
import type { SurveyTemplate } from './surveyTemplateModel';
import { SURVEY_PAGE_TYPE } from '~config';
export class Surveys extends Model<InferAttributes<Surveys>, InferCreationAttributes<Surveys>> {
	//ATTRIBUTES
	declare surveyId: CreationOptional<number>;
	declare svname: string;
	declare expiration: CreationOptional<Date>;
	declare messageReminder: string | null;
	declare pageType: SURVEY_PAGE_TYPE;
	declare totalRespondents: CreationOptional<number>;
	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	declare surveyImage: string | null;

	declare SurveyTemplates?: CreationOptional<SurveyTemplate[]>;

	static initClass = (sequelize: Sequelize) =>
		Surveys.init(
			{
				surveyId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
				svname: { type: DataTypes.STRING(100), allowNull: false },
				expiration: DataTypes.DATE,
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
				surveyImage: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				messageReminder: { type: DataTypes.STRING(1000), allowNull: true, defaultValue: null },
				pageType: {
					type: DataTypes.ENUM(...Object.values(SURVEY_PAGE_TYPE)),
					allowNull: false,
					defaultValue: SURVEY_PAGE_TYPE.SINGLE_PAGE,
				},
				totalRespondents: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'Surveys',
				modelName: 'Surveys',
				name: {
					singular: 'Survey',
					plural: 'Surveys',
				},
			},
		);
}
