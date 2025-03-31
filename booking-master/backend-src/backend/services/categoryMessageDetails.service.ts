import 'moment-timezone';
import { CreationAttributes, Transaction, UpdateOptions } from 'sequelize';
import { db } from '../models';
import { CategoryMessageDetail } from '~models/categoryMessageDetail';

export const createCategoryMessageDetails = async (
	params: CreationAttributes<CategoryMessageDetail>,
	transaction?: Transaction,
) => {
	return await db.categoryMessageDetails.create(params, { transaction });
};

export const updateCategoryMessageDetails = async (
	where: Partial<Omit<CategoryMessageDetail, 'createdAt' | 'updatedAt'>>,
	data: Partial<Omit<CategoryMessageDetail, 'createdAt' | 'updatedAt'>>,
	transaction?: Transaction,
): Promise<[affectedCount: number]> => {
	const options: UpdateOptions = {
		where,
		transaction,
	};

	return CategoryMessageDetail.update(data, options);
};

export const getCategoryMessageDetail = async (
	where: Partial<Omit<CategoryMessageDetail, 'createdAt' | 'updatedAt'>>,
	transaction?: Transaction,
): Promise<CategoryMessageDetail | null> => CategoryMessageDetail.findOne({ where, transaction });
