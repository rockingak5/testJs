import moment = require('moment');
import schedule = require('node-schedule');
import { get as _get } from 'lodash';
import { Op, Sequelize } from 'sequelize';
import {
	CRON_JOB_SEND_REMINDER,
	DATE_TIME_FORMAT_JP_NO_SEC,
	DAYS_REMINDER,
	MYSQL_DATE_FORMAT,
	REMINDER_NOTIFY_TYPES,
} from '../config';
import { CronExpression } from '~enums';
import { db } from '~models';
import { systemConfig } from '../config';
import { Member } from '../models/memberModel';
import { sendTextMessage } from './lineService';
import { updateIsNotified } from './registrationService';
import { destroyReminderByRegistrationIdAndType, getReminders } from './reminderService';
import { getEndOfDayBeforeDaysToDate, getStartOfDayBeforeDaysToDate } from '~utilities/commonDateTime';
import { writeLog } from '~utilities';

const replacerName = new RegExp(/\[NAME\]/, 'gm');
const replacerDateTime = new RegExp(/\[DATE\]/, 'gm');
const replacerTelephoneCompany = new RegExp(/\[COMPANY-TEL\]/, 'gm');
const replacerPresent = new RegExp(/\[PRESENT\]/, 'gm');
const replacerCampaign = new RegExp(/\[CAMPAIGN\]/, 'gm');

interface IReminderNotifyGuest {
	lineId: string;
	message: string;
	registrationId: number;
	type: Partial<REMINDER_NOTIFY_TYPES>;
}

const notifyGuests = async (
	reminders: { lineId: string; message: string; registrationId: number; type: Partial<REMINDER_NOTIFY_TYPES> }[],
) => {
	for (const item of reminders) {
		const { lineId, message, type, registrationId } = item;
		const transaction = await db.sequelize.transaction();
		try {
			await sendTextMessage(lineId, message);
			await updateIsNotified(registrationId, type, transaction);
			await destroyReminderByRegistrationIdAndType(registrationId, type, transaction);
			await transaction.commit();
		} catch (err) {
			if (transaction != null) {
				await transaction.rollback();
			}
			writeLog(
				{
					msg: `Cannot send reminder for lineId: ${lineId}, type: ${type}, registrationId: ${registrationId}`,
					err: err,
				},
				'info',
			);
		}
	}
};

export const runMessageNotification = async () => {
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	console.log('start run cronjob runMessageNotification', CRON_JOB_SEND_REMINDER, new Date(), timezone);
	schedule.scheduleJob(CRON_JOB_SEND_REMINDER, async function () {
		// schedule.scheduleJob(messageRule, async function () {
		if (systemConfig.NODE_ENV === 'production') {
			console.log('start run cronjob runMessageNotification schedule.scheduleJob', new Date());
			const startOfAfter1Day = getStartOfDayBeforeDaysToDate({ days: DAYS_REMINDER.one_day }).format(MYSQL_DATE_FORMAT);
			const endOfDayAfter1Day = getEndOfDayBeforeDaysToDate({ days: DAYS_REMINDER.one_day }).format(MYSQL_DATE_FORMAT);

			const remindersAfter1Day = await getReminders({
				remindDT: { [Op.between]: [startOfAfter1Day, endOfDayAfter1Day] },
				key: REMINDER_NOTIFY_TYPES.one_day,
			});

			console.log('reminders 1 day', remindersAfter1Day, startOfAfter1Day, endOfDayAfter1Day);

			const startOfAfter7Days = getStartOfDayBeforeDaysToDate({ days: DAYS_REMINDER.seven_day }).format(
				MYSQL_DATE_FORMAT,
			);
			const endOfDayAfter7Days = getEndOfDayBeforeDaysToDate({ days: DAYS_REMINDER.seven_day }).format(
				MYSQL_DATE_FORMAT,
			);

			const remindersAfter7Days = await getReminders({
				remindDT: { [Op.between]: [startOfAfter7Days, endOfDayAfter7Days] },
				key: REMINDER_NOTIFY_TYPES.another_day,
			});

			console.log('reminders 7 days', remindersAfter7Days, startOfAfter7Days, endOfDayAfter7Days);

			const reminderNotifyGuest: IReminderNotifyGuest[] = [];

			if (remindersAfter1Day.length > 0) {
				reminderNotifyGuest.push(
					...remindersAfter1Day.map((r) => ({
						lineId: (r.Member as Member).lineId as string,
						message: r.message,
						registrationId: r.registrationId,
						type: REMINDER_NOTIFY_TYPES.one_day,
					})),
				);
			}
			if (remindersAfter7Days.length > 0) {
				reminderNotifyGuest.push(
					...remindersAfter7Days.map((r) => ({
						lineId: (r.Member as Member).lineId as string,
						message: r.message,
						registrationId: r.registrationId,
						type: REMINDER_NOTIFY_TYPES.another_day,
					})),
				);
			}

			await notifyGuests(reminderNotifyGuest);
		}
	});
	return;
};

export const campaignWinnerNotification = () => {
	schedule.scheduleJob(CronExpression.EVERY_MINUTE, async () => {
		try {
			const now = moment();
			const from = now.clone().startOf('minutes');
			const to = now.clone().endOf('minutes');
			const settings = await db.systemSettings.findAll({
				raw: true,
				where: {
					name: {
						[Op.in]: ['companyTelephone', 'winningMessage'],
					},
				},
				attributes: [
					//,
					'valueString',
					'name',
				],
			});

			const settingsMap: Record<string, any> = settings.reduce((acc, setting) => {
				switch (setting.name) {
					case 'companyTelephone':
						return {
							...acc,
							'COMPANY-TEL': setting.valueString,
						};
					case 'winningMessage':
						return {
							...acc,
							winningMessage: setting.valueString,
						};
					default:
						return acc;
				}
			}, {});

			const registrations = await db.registrations.findAll({
				where: {
					isWin: true,
					isNotificationSent: false,
				},
				include: [
					{
						association: db.registrations.associations.Campaign,
						where: {
							presentIssueTiming: {
								[Op.between]: [from, to],
							},
						},
						attributes: [],
					},
					{
						association: db.registrations.associations.Member,
						attributes: [],
					},
					{
						association: db.registrations.associations.memberGifts,
						attributes: [],
						include: [
							{
								association: db.memberGifts.associations.Gift,
								attributes: [],
							},
						],
					},
				],
				attributes: [
					//
					[Sequelize.literal('`Registration`.`createdAt`'), 'DATE'],
					[Sequelize.literal('`Member`.`displayName`'), 'NAME'],
					[Sequelize.literal('`Campaign`.`title`'), 'CAMPAIGN'],
					[Sequelize.literal('`memberGifts->Gift`.`title`'), 'PRESENT'],
					[Sequelize.literal('`Member`.`lineId`'), 'lineId'],
				],
				raw: true,
			});

			for (const registration of registrations) {
				const message = `${settingsMap.winningMessage}`
					.replace(replacerName, _get(registration, 'NAME', ''))
					.replace(replacerDateTime, moment(_get(registration, 'DATE', '')).format(DATE_TIME_FORMAT_JP_NO_SEC))
					.replace(replacerTelephoneCompany, `${settingsMap['COMPANY-TEL']}`)
					.replace(replacerPresent, _get(registration, 'PRESENT', ''))
					.replace(replacerCampaign, _get(registration, 'CAMPAIGN', ''));

				await sendTextMessage(_get(registration, 'lineId', ''), message);
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.log('🚀 ~ file: scheduledTaskService.ts:50 ~ schedule.scheduleJob ~ error:', error);
		}
	});
};
