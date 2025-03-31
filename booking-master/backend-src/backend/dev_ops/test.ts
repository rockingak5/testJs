/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
import 'dotenv/config';
import { log } from 'console';
import { db } from '../models';
import { error } from 'console';
import { Member } from '../models/memberModel';
import moment = require('moment');
// import { updateIsNotified1, updateIsNotified2 } from '../services/registrationService';
import { getReminders, destroyReminders } from '../services/reminderService';
// import { NotifyGuests } from '../services/scheduledTaskService';
import { Op } from 'sequelize';
import { listMembers } from '../services/memberService';
async function syncDB() {
	return db.sequelize.authenticate();
}
// const okPromise = () => new Promise((resolve, reject) => resolve('not ok'));
// const failPromise = () => new Promise((resolve, reject) => reject('not ok'));
// async function awaitFunc(timeInMS: number, text: string) {
//     return new Promise((resolve, reject) => {
//         setTimeout(() => {
//             console.log(text);
//             resolve(text);
//         }, 1000);
//     });
// }
syncDB()
	// .then(() => db.occurrences.associations)
	.then(async () => {
		// let members = await generateMembersData({});
		// log(members.map(m => m.toJSON()));
	})
	.then(async () => {
		// let before1day = moment().subtract(1, 'day').toDate();
		// let after5minutes = moment('2022-11-11 16:45:00').add(4, 'minutes').toDate();
		// log({ before1day, after5minutes });
		// let reminders = await getReminders({ remindDT: { [Op.between]: [before1day, after5minutes] } });
		// log({ reminders });
		// if (reminders.length > 0) {
		//     let remindersNotify1 = reminders.filter(r => r.key == 'isNotified1').map(r => r.registrationId);
		//     let remindersNotify2 = reminders.filter(r => r.key == 'isNotified2').map(r => r.registrationId);
		//     await NotifyGuests(reminders.map(r =>
		//         ({ lineId: (r.Member as Member).lineId as string, message: r.message, registrationId: r.registrationId })));
		//     await Promise.all([
		//         updateIsNotified1(remindersNotify1),
		//         updateIsNotified2(remindersNotify2),
		//     ]);
		//     await destroyReminders(reminders.map(r => r.reminderId));
		// }
	})
	.then((result) => {
		console.log(result);
	})
	// .then(candidates => console.log(candidates.map(c => c.memberId)))
	.then(console.log)
	.then(() => {
		log('test complete', 'info');
		process.exit(0);
	})
	.catch((e) => {
		error('caught here', e);
		process.exit(1);
	});
