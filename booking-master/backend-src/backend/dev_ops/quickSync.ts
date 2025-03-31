import 'dotenv/config';
import { log } from 'console';
import { db } from '../models';
async function syncDB() {
	return db.sequelize.sync({ alter: false });
}
syncDB()
	.then(() => {
		log('db sync finished', 'info');
		process.exit(0);
	})
	.catch((e) => {
		throw e;
	});
