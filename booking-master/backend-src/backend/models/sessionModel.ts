import { Sequelize, Model, DataTypes, Optional } from 'sequelize';
interface sessionStructure {
	sid: string;
	expires: Date;
	data: string;
}
interface sessionCreationAttributes extends Optional<sessionStructure, 'sid'> {}
export class Session extends Model<sessionCreationAttributes> implements sessionStructure {
	public sid!: string;
	public expires!: Date;
	public data!: string;

	static initClass(sequelize: Sequelize) {
		return Session.init(
			{
				sid: { type: DataTypes.STRING(36), primaryKey: true },
				expires: { type: DataTypes.DATE, allowNull: false },
				data: { type: DataTypes.STRING(), allowNull: false },
			},
			{
				sequelize: sequelize,
				tableName: 'sessions',
				modelName: 'Session',
				timestamps: true,
				paranoid: false,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'Session',
					plural: 'sessions',
				},
			},
		);
	}
}
