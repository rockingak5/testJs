import { db } from '../models';
import type { DbType } from '../types/db';
import { writeLog } from '../utilities';

export async function initializeDatabase(db: DbType) {
	return await db.sequelize.authenticate().catch((e) => {
		writeLog({ msg: 'could not initialize db', error: e }, 'crit');
		throw e;
	});
}
export function getDB() {
	return db;
}
