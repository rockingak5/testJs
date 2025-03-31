import { Transaction } from 'sequelize';
import { db } from '../models';

export const getManager = async (managerId: number) => db.managers.findByPk(managerId);
export const findManagerByUsername = async (username: number, transaction?: Transaction) =>
	db.managers.findOne({ where: { username }, transaction });
