export default {
	HOST: process.env.DB_HOST as string,
	USER: process.env.DB_USER as string,
	PASSWORD: process.env.DB_PASSWORD as string,
	DB: process.env.DB_DB as string,
	DIALECT: process.env.DB_DIALECT as string,
	PORT: process.env.DB_PORT as undefined,
	POOL: {
		max: 10,
		min: 0,
		acquire: 30000,
		idle: 10000,
	},
	LOGGING: undefined,
};
