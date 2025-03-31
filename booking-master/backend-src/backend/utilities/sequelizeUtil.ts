import { FindOptions, Op, Sequelize } from 'sequelize';
import { SORT } from '~config';

export const generateWhereClauseBetween = <T = number | string | Date>(name: string, values: [T, T]) => {
	const [min, max] = values;

	if (!min && !max) return {};

	if (!min || !max) {
		if (min) return { [name]: { [Op.gte]: min } };
		if (max) return { [name]: { [Op.lte]: max } };
	}

	return { [name]: { [Op.between]: [min, max] } };
};

export const buildPaginationParams = (pagination: paginationParams): FindOptions => ({
	...(pagination?.pp ? { limit: pagination.pp } : {}),
	...(pagination?.p ? { offset: (pagination.p - 1) * pagination.pp } : {}),
	...(pagination?.sortKey
		? {
				order: [
					[pagination.sortKey, Sequelize.literal('IS NULL ASC')],
					[pagination.sortKey, pagination?.sort || SORT.DESCENDING],
				],
		  }
		: {}),
});
