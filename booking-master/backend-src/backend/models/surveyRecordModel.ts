import { DataTypes, Model, Sequelize } from 'sequelize';

export class SurveyRecord extends Model {
	// ATTRIBUTES
	declare rcId: number;
	declare tpId: number;
	declare surveyId: number;
	declare lineUserId: string;
	declare content: Text;
	// TIMESTAMPS
	declare createdAt: Date;
	declare updatedAt: Date;

	static initClass(sequelize: Sequelize) {
		SurveyRecord.init(
			{
				rcId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
				content: { type: DataTypes.TEXT, allowNull: true },
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'SurveyRecords',
				modelName: 'SurveyRecord',
				name: {
					singular: 'SurveyRecord',
					plural: 'SurveyRecords',
				},
			},
		);
	}
}
