import moment = require('moment');
import 'moment-timezone';
import { CreationAttributes, Op, Transaction, WhereAttributeHash } from 'sequelize';
import { db } from '../models';
import { Reminder } from '../models/reminderModel';
import { DAYS_REMINDER, REMINDER_NOTIFY_TYPES, TIME_ZONE_DEFAULT } from '~config';
import { isDateAfterOrEqualDays } from '~utilities/commonDateTime';

export const createReminder = async (
	params: CreationAttributes<Reminder> & {
		startAt: string | Date;
		fullName: string;
		telephone?: string | null;
		confirmationUrl?: string | null;
		buildingInfo: string;
		timeZone: string;
	},
	regexps: {
		replacerName: RegExp;
		replacerDateTime: RegExp;
		replacerTelephoneCompany: RegExp;
		replacerConfirmationUrl: RegExp;
		replacerBuilding: RegExp;
	},
	transaction?: Transaction,
) => {
	const messageToClient = params.message;
	let reminderMessage = messageToClient.replace(regexps.replacerName, `${params.fullName}`);
	reminderMessage = reminderMessage.replace(
		regexps.replacerDateTime,
		params.startAt ? moment(params.startAt).tz(TIME_ZONE_DEFAULT).format('YYYY年MM月DD日HH時mm分') : '',
		// moment(params.startAt).format('YYYY年MM月DD日HH時mm分')
	);
	reminderMessage = reminderMessage.replace(regexps.replacerTelephoneCompany, `${params.telephone ?? ''}`);
	reminderMessage = reminderMessage.replace(regexps.replacerConfirmationUrl, `${params.confirmationUrl ?? ''}`);
	reminderMessage = reminderMessage.replace(regexps.replacerBuilding, params.buildingInfo);
	return await db.reminders.create(
		{
			memberId: params.memberId,
			registrationId: params.registrationId,
			message: reminderMessage,
			remindDT: params.remindDT,
			key: params.key,
		},
		{ transaction },
	);
};

export const getReminders = async (where: WhereAttributeHash, transaction?: Transaction) => {
	return db.reminders.findAll({
		where: where,
		include: {
			association: db.reminders.associations.Member,
			where: {
				lineId: { [Op.not]: null },
				isFriends: true,
			},
			required: true,
			attributes: ['lineId'],
		},
		transaction,
	});
};

export const destroyReminders = async (reminderIds: number[], transaction?: Transaction) => {
	if (reminderIds.length == 0) {
		return;
	}
	return db.reminders.destroy({
		where: { reminderId: { [Op.in]: reminderIds } },
		transaction,
	});
};

export const destroyReminderByRegistrationId = async (registrationId: number, transaction?: Transaction) => {
	return db.reminders.destroy({
		where: { registrationId },
		transaction,
	});
};

export const destroyReminderByRegistrationIdAndType = async (
	registrationId: number,
	key: string,
	transaction?: Transaction,
) => {
	return db.reminders.destroy({
		where: { registrationId, key },
		transaction,
	});
};

export const createMessageReminderEvent = async ({
	messagesToClient,
	registrationResult,
	memberId,
	nameMember,
	timeZone,
	replacerName,
	replacerBuilding,
	replacerConfirmationUrl,
	replacerDateTime,
	replacerTelephoneCompany,
}: CreateMessageReminderEvent) => {
	const { isMessage, reminderMessageOneDay, reminderMessageThreeDays, startAt } = registrationResult;
	const eventStartAtISO = moment(startAt).toISOString();
	const messageReminderOneDay = isMessage ? reminderMessageOneDay : messagesToClient?.remind2?.valueString;
	const afterOrEqualOneDay = isDateAfterOrEqualDays(eventStartAtISO, DAYS_REMINDER.one_day);

	const confirmationUrl = messagesToClient?.bookConfirmationUrl?.valueString ?? '';
	const companyTelephone = messagesToClient?.companyTelephoneForTemplate?.valueString ?? '';
	const buildingInfo = registrationResult?.categoryTitle;

	if (messageReminderOneDay && afterOrEqualOneDay) {
		await createReminder(
			{
				startAt: registrationResult.startAt,
				remindDT: registrationResult.startAt,
				registrationId: registrationResult.registrationId,
				memberId: memberId,
				message: messageReminderOneDay,
				fullName: nameMember ?? '',
				telephone: companyTelephone,
				confirmationUrl: confirmationUrl,
				key: REMINDER_NOTIFY_TYPES.one_day,
				buildingInfo: buildingInfo,
				timeZone: timeZone,
			},
			{
				replacerName,
				replacerBuilding,
				replacerConfirmationUrl,
				replacerDateTime,
				replacerTelephoneCompany,
			},
		);
	}

	const messageReminderAnotherDays = isMessage ? reminderMessageThreeDays : messagesToClient?.remind1?.valueString;
	const afterAnotherDays = isDateAfterOrEqualDays(eventStartAtISO, DAYS_REMINDER.seven_day);

	if (messageReminderAnotherDays && afterAnotherDays) {
		await createReminder(
			{
				startAt: registrationResult?.startAt,
				remindDT: registrationResult.startAt,
				registrationId: registrationResult?.registrationId,
				memberId: memberId,
				message: messageReminderAnotherDays,
				fullName: nameMember ?? '',
				telephone: companyTelephone,
				confirmationUrl: confirmationUrl,
				key: REMINDER_NOTIFY_TYPES.another_day,
				buildingInfo: buildingInfo,
				timeZone: timeZone,
			},
			{
				replacerName,
				replacerBuilding,
				replacerConfirmationUrl,
				replacerDateTime,
				replacerTelephoneCompany,
			},
		);
	}
	return true;
};
