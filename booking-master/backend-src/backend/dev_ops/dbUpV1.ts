import 'dotenv/config';
import { log } from 'console';
import { db } from '../models';
async function syncDB() {
	return db.sequelize.sync({ alter: true });
}
syncDB()
	.then(() =>
		db.registrations
			.findAll({
				paranoid: false,
				include: [
					{
						association: db.registrations.associations.Occurrence,
						paranoid: false,
						include: [
							{
								association: db.occurrences.associations.Occasion,
								paranoid: false,
							},
						],
					},
				],
			})
			.then((registrations) =>
				Promise.all(
					registrations.map((registration) => {
						const occurrence = registration.Occurrence;
						const occasion = occurrence?.Occasion;
						if (occurrence == null || occasion == null) {
							return;
						} else {
							return Promise.all([
								occurrence.update({ categoryId: occasion.categoryId }),
								registration.update({
									categoryId: occasion.categoryId,
									occasionId: occasion.occasionId,
								}),
							]);
						}
					}),
				),
			),
	)
	.then(() => {
		log('db sync finished', 'info');
		process.exit(0);
	})
	.catch((e) => {
		throw e;
	});
