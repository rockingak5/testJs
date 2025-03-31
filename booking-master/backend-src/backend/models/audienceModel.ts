import { Sequelize, Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { AUDIENCE_TYPE } from '~config';

export class Audience extends Model<InferAttributes<Audience>, InferCreationAttributes<Audience>> {
	//ATTRIBUTES
	declare audienceGroupId: CreationOptional<number>;
	declare description: string;
	declare audienceCount: number;
	declare searchCondition: string | object | null;
	declare remarks: string | object | null;
	declare type?: AUDIENCE_TYPE;
	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;

	static initClass = (sequelize: Sequelize) =>
		Audience.init(
			{
				audienceGroupId: { type: DataTypes.STRING({ length: 15 }), primaryKey: true },
				audienceCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
				description: { type: DataTypes.STRING(120), allowNull: true },
				searchCondition: { type: DataTypes.JSON, allowNull: true },
				remarks: { type: DataTypes.JSON, allowNull: true },
				type: {
					type: DataTypes.ENUM(...Object.values(AUDIENCE_TYPE)),
					allowNull: true,
					defaultValue: 'default',
				},
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				tableName: 'audiences',
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'Audience',
					plural: 'audiences',
				},
			},
		);
}
