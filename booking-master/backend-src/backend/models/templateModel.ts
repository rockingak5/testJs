import {
	CreationAttributes,
	CreationOptional,
	DataTypes,
	InferAttributes,
	InferCreationAttributes,
	Model,
	Sequelize,
} from 'sequelize';
export class Template extends Model<InferAttributes<Template>, InferCreationAttributes<Template>> {
	//ATTRIBUTES
	declare templateId: CreationOptional<number>;
	declare name: string;
	declare contents: string;
	declare description: string | null;
	//TIMESTAMPS
	declare createdAt: CreationOptional<Date>;
	declare updatedAt: CreationOptional<Date>;

	static initClass = (sequelize: Sequelize) =>
		Template.init(
			{
				templateId: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
				name: { type: DataTypes.STRING(100), allowNull: false },
				contents: { type: DataTypes.STRING(500), allowNull: false },
				description: { type: DataTypes.STRING(200), allowNull: true },
				createdAt: DataTypes.DATE,
				updatedAt: DataTypes.DATE,
			},
			{
				sequelize: sequelize,
				timestamps: true,
				paranoid: false,
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
				tableName: 'templates',
				modelName: 'Template',
				name: {
					singular: 'template',
					plural: 'templates',
				},
			},
		);

	static createTemplate = async (params: CreationAttributes<Template>) =>
		Template.create({ name: params.name, contents: params.contents, description: params.description });

	static getTemplate = async (id: number) => Template.findOne({ where: { templateId: id } });

	static getTemplateByName = async (name: string) => Template.findOne({ where: { name: name } });

	static getTemplates = async () => Template.findAll();

	static updateTemplate = async (id: number, params: { name: string; contents: string; description: string }) => {
		const newValues: Record<string, string> = {};
		if (params.name) newValues.name = params.name;
		if (params.contents) newValues.contents = params.contents;
		if (params.description) newValues.description = params.description;
		return Template.update(newValues, {
			where: { templateId: id },
		});
	};

	static deleteTemplate = async (id: number) => {
		const isDestroyed = await Template.destroy({ where: { templateId: id } });
		return isDestroyed > 0;
	};

	static deleteAllTemplates = async () => {
		const isAllDestroyed = await Template.destroy({ where: {} });
		return isAllDestroyed > 0;
	};
}
