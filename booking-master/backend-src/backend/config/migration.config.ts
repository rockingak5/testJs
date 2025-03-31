import type { Config } from 'sequelize';

import { TZ_DATABASE } from './constants';
import { dbConfig } from '.';

module.exports = {
	development: {
		username: dbConfig.USER,
		password: dbConfig.PASSWORD,
		database: dbConfig.DB,
		host: dbConfig.HOST,
		dialect: dbConfig.DIALECT,
		pool: dbConfig.POOL,
		seederStorage: 'sequelize',
		seederStorageTableName: 'SequelizeData',
		timezone: TZ_DATABASE,
	},
	test: {
		username: dbConfig.USER,
		password: dbConfig.PASSWORD,
		database: dbConfig.DB,
		host: dbConfig.HOST,
		dialect: dbConfig.DIALECT,
		pool: dbConfig.POOL,
		seederStorage: 'sequelize',
		seederStorageTableName: 'SequelizeData',
		timezone: TZ_DATABASE,
	},
	production: {
		username: dbConfig.USER,
		password: dbConfig.PASSWORD,
		database: dbConfig.DB,
		host: dbConfig.HOST,
		dialect: dbConfig.DIALECT,
		pool: dbConfig.POOL,
		seederStorage: 'sequelize',
		seederStorageTableName: 'SequelizeData',
		timezone: TZ_DATABASE,
	},
} as Record<
	'development' | 'test' | 'production',
	Pick<Config, 'username' | 'password' | 'database' | 'host' | 'pool'>
>;
