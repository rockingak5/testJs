import { CreationOptional, DataTypes, ForeignKey, Model, Sequelize } from 'sequelize';
import { DATABASE_TABLE_NAME, SURVEY_NAVIGATION_TYPE } from '~config';

export class SurveyTemplate extends Model {
	// ATTRIBUTES
	declare tpId: CreationOptional<number>;
	declare surveyId: number;
	declare type: 'text' | 'datepicker' | 'checkbox' | 'radio' | 'image';
	declare label: string;
	declare showOrder: number;
	declare required: boolean;
	declare isDisplayed: boolean;
	declare isDelete: boolean;
	declare options?: string;
	// TIMESTAMPS
	declare createdAt?: CreationOptional<Date>;
	declare updatedAt?: CreationOptional<Date>;
	declare navigationType: SURVEY_NAVIGATION_TYPE;
	declare nextQuestionId?: CreationOptional<number>;

	static initClass(sequelize: Sequelize) {
		SurveyTemplate.init(
			{
				tpId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
				type: { type: DataTypes.STRING(50), allowNull: false },
				label: { type: DataTypes.STRING(255), allowNull: false },
				showOrder: { type: DataTypes.INTEGER, allowNull: false },
				required: { type: DataTypes.BOOLEAN, allowNull: false },
				isDisplayed: { type: DataTypes.BOOLEAN, allowNull: false },
				isDelete: { type: DataTypes.BOOLEAN, allowNull: false },
				options: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },
				navigationType: {
					type: DataTypes.ENUM(...Object.values(SURVEY_NAVIGATION_TYPE)),
					allowNull: false,
				},
				questionImage: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
				nextQuestionId: { type: DataTypes.INTEGER, allowNull: true },
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: DATABASE_TABLE_NAME.SURVEY_TEMPLATE,
				modelName: 'SurveyTemplate',
				name: {
					singular: 'SurveyTemplate',
					plural: DATABASE_TABLE_NAME.SURVEY_TEMPLATE,
				},
			},
		);
	}
}
