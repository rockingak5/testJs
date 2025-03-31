import { CreationAttributes, Op, Transaction, WhereAttributeHash } from 'sequelize';
import { SYSTEM_ERROR } from '../config';
import { db } from '../models';
import { Template } from '../models/templateModel';
import { AppError } from '../utilities';

export const createTemplate = async (
	{ name, contents, description }: CreationAttributes<Template>,
	transaction?: Transaction,
) =>
	db.templates.create(
		{
			name: name,
			contents: contents,
			description: description,
		},
		{ transaction },
	);

export const getTemplate = async (templateId: number) => db.templates.findOne({ where: { templateId: templateId } });

export const browseTemplates = async (searchParams: WhereAttributeHash) => {
	const where: WhereAttributeHash = {};
	if (searchParams.name) where.name = { [Op.like]: `%${searchParams.name}%` };
	if (searchParams.contents) where.contents = { [Op.like]: `%${searchParams.contents}%` };
	if (searchParams.description) where.description = { [Op.like]: `%${searchParams.description}%` };
	if (searchParams.asArray) {
		return db.templates.findAll({ where: where });
	} else {
		return db.templates.findOne({ where: where });
	}
};

export const updateTemplate = async (
	{ templateId, name, contents, description }: CreationAttributes<Template>,
	transaction?: Transaction,
) =>
	db.templates
		.findByPk(templateId, {
			transaction,
		})
		.then((template) => {
			if (template == null) {
				throw new AppError(SYSTEM_ERROR, `template ${templateId} not found`, false);
			} else {
				return template;
			}
		})
		.then((template) => {
			if (name != undefined) {
				template.set({ name });
			}
			if (contents != undefined) {
				template.set({ contents });
			}
			if (description != undefined) {
				template.set({ description });
			}
			return template.save({ transaction });
		});

export const deleteTemplate = async (templateId: number, transaction?: Transaction) =>
	db.templates
		.findByPk(templateId, {
			transaction,
		})
		.then((template) => {
			if (template == null) {
				throw new AppError(SYSTEM_ERROR, `template ${templateId} not found`, false);
			} else {
				return template;
			}
		})
		.then(async (template) => {
			const deletedTemplate = template.get();
			await template.destroy({ transaction });
			return deletedTemplate;
		});
