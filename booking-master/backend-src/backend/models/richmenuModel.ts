import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, Sequelize } from 'sequelize';

import { DATABASE_TABLE_NAME, RICH_MENU_TYPE, RICH_MENU_TYPES } from '../config';

export class Richmenu extends Model<InferAttributes<Richmenu>, InferCreationAttributes<Richmenu>> {
	declare id: CreationOptional<number>;
	declare richMenuId: CreationOptional<string> | null;
	declare picUrl: string;
	declare type: RICH_MENU_TYPE;
	declare isDisplayed: boolean;
	declare name: 'isRegistered' | 'notRegistered';
	declare template?: string;
	declare areas: Record<string, any>[];
	declare width: number;
	declare height: number;
	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;

	static initClass = (sequelize: Sequelize) =>
		Richmenu.init(
			{
				id: { type: DataTypes.INTEGER({ unsigned: true }), autoIncrement: true, primaryKey: true },
				richMenuId: { type: DataTypes.STRING(64), unique: true, allowNull: true, defaultValue: null },
				name: { type: DataTypes.STRING, allowNull: false },
				picUrl: { type: DataTypes.STRING(150), allowNull: false },
				areas: { type: DataTypes.JSON, allowNull: false },
				type: { type: DataTypes.ENUM, values: RICH_MENU_TYPES, allowNull: false },
				isDisplayed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
				template: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
				width: { type: DataTypes.INTEGER({ unsigned: true }), allowNull: false },
				height: { type: DataTypes.INTEGER({ unsigned: true }), allowNull: false },
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: DATABASE_TABLE_NAME.RICH_MENU,
				name: {
					singular: 'RichMenu',
					plural: 'RichMenus',
				},
			},
		);
}
