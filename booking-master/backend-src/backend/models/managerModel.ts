import { Model, Sequelize, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class Manager extends Model<InferAttributes<Manager>, InferCreationAttributes<Manager>> {
	//ATTRIBUTES
	declare managerId: CreationOptional<number>;
	declare username: string;
	declare pwhash: string;
	declare recoveryMail: string;
	declare authLevel: number;
	declare isActivated: CreationOptional<boolean>;
	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;
	//ASSOCIATIONS
	static initClass = (sequelize: Sequelize, { defaultAuthLevel }: { defaultAuthLevel: number }) =>
		Manager.init(
			{
				managerId: {
					type: DataTypes.INTEGER({ unsigned: true }),
					allowNull: false,
					primaryKey: true,
					autoIncrement: true,
				},
				username: { type: DataTypes.STRING, allowNull: false, unique: 'username' },
				pwhash: { type: DataTypes.STRING, allowNull: false },
				recoveryMail: { type: DataTypes.STRING, allowNull: true },
				authLevel: { type: DataTypes.INTEGER, defaultValue: defaultAuthLevel, allowNull: false },
				isActivated: { type: DataTypes.BOOLEAN, defaultValue: false },
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				tableName: 'managers',
				timestamps: true,
				paranoid: false,
				sequelize: sequelize,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'Manager',
					plural: 'managers',
				},
			},
		);
}
