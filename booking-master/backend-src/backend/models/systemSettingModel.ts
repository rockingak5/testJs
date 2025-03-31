import {
	Model,
	Sequelize,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	CreationOptional,
	CreationAttributes,
} from 'sequelize';
export class SystemSetting extends Model<InferAttributes<SystemSetting>, InferCreationAttributes<SystemSetting>> {
	//ATTRIBUTES
	declare name: string;
	declare label: string;
	declare valueFlag: boolean | null;
	declare valueString: string | null;
	declare valueNumber: number | null;
	declare isPublic: CreationOptional<boolean>;
	//ASSOCIATIONS
	static initClass = (sequelize: Sequelize) =>
		SystemSetting.init(
			{
				name: { type: DataTypes.STRING(50), primaryKey: true, allowNull: false },
				label: { type: DataTypes.STRING(50), allowNull: false },
				valueFlag: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
				valueString: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
				valueNumber: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
				isPublic: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
			},
			{
				sequelize: sequelize,
				tableName: 'systemSettings',
				timestamps: false,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				name: {
					singular: 'SystemSetting',
					plural: 'systemSettings',
				},
			},
		);

	//METHODS
	static findSettings = async (key: string) => SystemSetting.findOne({ where: { name: key } });

	static getSettings = async () =>
		SystemSetting.findAll().then((publicSettings) => {
			const result: Record<string, systemSettingType> = {};
			publicSettings.forEach((ps) => {
				const key = ps.name;
				// eslint-disable-next-line security/detect-object-injection
				result[key] = {
					label: ps.label,
					valueFlag: ps.valueFlag,
					valueString: ps.valueString,
					valueNumber: ps.valueNumber,
				};
			});
			return result;
		});

	static findPublicSettings = async () =>
		SystemSetting.findAll({ where: { isPublic: true } }).then((publicSettings) => {
			const result: Record<string, systemSettingType> = {};
			publicSettings.forEach((ps) => {
				const key = ps.name;
				// eslint-disable-next-line security/detect-object-injection
				result[key] = {
					label: ps.label,
					valueFlag: ps.valueFlag,
					valueString: ps.valueString,
					valueNumber: ps.valueNumber,
				};
			});
			return result;
		});

	static createSettings = async (params: CreationAttributes<SystemSetting>) => SystemSetting.create(params);

	static deleteSettings = async (key: string) => SystemSetting.destroy({ where: { name: key } });

	//FAVICON
	static findFavicon = async () => SystemSetting.findOne({ where: { name: 'favicon' }, attributes: ['valueString'] });

	//LOGO
	static findLogo = async () => SystemSetting.findOne({ where: { name: 'logo' }, attributes: ['valueString'] });

	static findStorePic = async () => SystemSetting.findOne({ where: { name: 'storePic' }, attributes: ['valueString'] });
}
