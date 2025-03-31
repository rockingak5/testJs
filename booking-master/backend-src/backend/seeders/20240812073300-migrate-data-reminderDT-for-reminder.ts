import { Migration } from 'sequelize-cli';
import { DAYS_REMINDER, MYSQL_DATE_FORMAT, REMINDER_NOTIFY_TYPES, TIME_ZONE_DEFAULT } from '../config';
import { getStartOfDayBeforeDaysToDate, isDateAfterOrEqualDays } from '~utilities/commonDateTime';
import { ReminderService } from '~services';
import { SystemSetting } from '~models/systemSettingModel';
import { Occasion } from '~models/occasionModel';
import { CategoryMessageDetail } from '~models/categoryMessageDetail';
import moment from 'moment';

const replacerName = new RegExp(/\[NAME\]/, 'gm');
const replacerDateTime = new RegExp(/\[DATE\]/, 'gm');
const replacerTelephoneCompany = new RegExp(/\[COMPANY-TEL\]/, 'gm');
const replacerConfirmationUrl = new RegExp(/\[CONFIRM-URL\]/, 'gm');
const replacerBuilding = new RegExp(/\[BUILDING\]/, 'gm');

let backupDataReminder: any = [];

module.exports = {
	async up(queryInterface, Sequelize) {
		console.log('start run', new Date());
		const transaction = await queryInterface.sequelize.transaction();
		const startOfAfter1Day = getStartOfDayBeforeDaysToDate({ days: 1 }).format(MYSQL_DATE_FORMAT);
		console.log('startOfAfter1Day', startOfAfter1Day);
		try {
			backupDataReminder = await queryInterface.sequelize.query('SELECT * FROM reminders', {
				type: Sequelize.QueryTypes.SELECT,
			});
			await queryInterface.sequelize.query('DELETE FROM reminders', {
				type: Sequelize.QueryTypes.DELETE,
			});
			// get all registration event that have memberId and the event has not deleted
			// Occurences container all time event
			// Category is all event if event has not program, event is category. If event has program, event is occasion
			const sqlRegistrations = `
				SELECT
					occurrences.startAt as startAt,
					registrations.registrationId as registrationId,
					registrations.memberId as memberId,
					occurrences.occasionId as occasionId,
					categories.isProgram as isProgram,
					categories.isMessage as categoriesIsMessage,
					members.customerRegistrationId1 as nameMember,
					categories.title as buildingInfo,
					categories.categoryId as categoryId
				FROM
					registrations
				JOIN
					occurrences ON occurrences.occurrenceId = registrations.occurrenceId
				JOIN
					categories ON categories.categoryId = registrations.categoryId
				JOIN
					members ON members.memberId = registrations.memberId
				WHERE
					registrations.categoryId IS NOT NULL 
				AND 
					registrations.memberId IS NOT NULL 
				AND 
					registrations.deletedAt IS NULL
				AND 
					categories.deletedAt IS NULL
				AND 
					occurrences.startAt >= :startOfAfter1Day
			`;

			const registrations: any[] = await queryInterface.sequelize.query(sqlRegistrations, {
				replacements: { startOfAfter1Day },
				type: Sequelize.QueryTypes.SELECT,
			});

			// get reminder system setting
			const systemReminderSql = `
				SELECT
					name, valueString
				FROM
					systemSettings
				WHERE
					name IN ('bookRegistrationMessage', 'bookRemind1Message', 'bookRemind2Message', 'bookConfirmUrl', 'companyTelephone', 'campaignApplyMessage')
			`;

			const reminderMessages: SystemSetting[] = await queryInterface.sequelize.query(systemReminderSql, {
				type: Sequelize.QueryTypes.SELECT,
			});

			const messagesToClient = {
				remind1: reminderMessages.find((r) => r.name == 'bookRemind1Message') ?? null,
				remind2: reminderMessages.find((r) => r.name == 'bookRemind2Message') ?? null,
				regiMessage: reminderMessages.find((r) => r.name == 'bookRegistrationMessage') ?? null,
				bookConfirmationUrl: reminderMessages.find((r) => r.name == 'bookConfirmUrl') ?? null,
				companyTelephoneForTemplate: reminderMessages.find((r) => r.name == 'companyTelephone') ?? null,
				campaignregiMessage: reminderMessages.find((r) => r.name == 'campaignApplyMessage') ?? null,
			};

			const confirmationUrl = messagesToClient?.bookConfirmationUrl?.valueString ?? '';
			const companyTelephone = messagesToClient?.companyTelephoneForTemplate?.valueString ?? '';
			console.log('Total Registrations', registrations.length);

			for (const registration of registrations) {
				const {
					startAt,
					registrationId,
					memberId,
					occasionId,
					isProgram,
					categoriesIsMessage,
					nameMember,
					buildingInfo,
					categoryId,
				} = registration;
				let isMessage = categoriesIsMessage;
				// Reminder event setting default by categoryID
				let sqlCategoryMessageDetails = `
					SELECT
						reminderMessageOneDay,
						reminderMessageThreeDays
					FROM
						categoryMessageDetails
					WHERE
						categoryId = :categoryId
				`;
				let replaceMentsCategoryMessage: any = {
					categoryId,
				};
				let isOccasionEmpty = false;
				if (isProgram) {
					const sqlOccasionById = `
						SELECT
							isMessage
						FROM
							occasions
						WHERE
							occasionId = :occasionId
						AND
							deletedAt IS NULL
					`;
					const occasion: Occasion[] = await queryInterface.sequelize.query(sqlOccasionById, {
						replacements: { occasionId },
						type: Sequelize.QueryTypes.SELECT,
					});
					isOccasionEmpty = Boolean(!occasion.length);
					isMessage = occasion[0].isMessage;
					// if event has program, get reminder event setting by occasionId
					sqlCategoryMessageDetails = `
						SELECT
							reminderMessageOneDay,
							reminderMessageThreeDays
						FROM
							categoryMessageDetails
						WHERE
							occasionId = :occasionId
					`;
					replaceMentsCategoryMessage = { occasionId };
				}

				const categoryMessageDetails: CategoryMessageDetail[] = await queryInterface.sequelize.query(
					sqlCategoryMessageDetails,
					{
						replacements: replaceMentsCategoryMessage,
						type: Sequelize.QueryTypes.SELECT,
					},
				);
				const reminderMessageOneDay = categoryMessageDetails[0]?.reminderMessageOneDay;
				const reminderMessageThreeDays = categoryMessageDetails[0]?.reminderMessageThreeDays;
				const messageReminderAnotherDays = isMessage
					? reminderMessageThreeDays
					: messagesToClient?.remind1?.valueString;
				const eventStartAtISO = moment(startAt).toISOString();
				const afterAnotherDays = isDateAfterOrEqualDays(eventStartAtISO, DAYS_REMINDER.seven_day);
				if (messageReminderAnotherDays && !isOccasionEmpty && afterAnotherDays) {
					await ReminderService.createReminder(
						{
							startAt,
							remindDT: startAt,
							registrationId,
							memberId,
							message: messageReminderAnotherDays,
							fullName: nameMember ?? '',
							telephone: companyTelephone,
							confirmationUrl: confirmationUrl,
							key: REMINDER_NOTIFY_TYPES.another_day,
							buildingInfo: buildingInfo,
							timeZone: TIME_ZONE_DEFAULT,
						},
						{
							replacerName,
							replacerBuilding,
							replacerConfirmationUrl,
							replacerDateTime,
							replacerTelephoneCompany,
						},
						transaction,
					);
				}
				const messageReminderOneDay = isMessage ? reminderMessageOneDay : messagesToClient?.remind2?.valueString;
				const afterOrEqualOneDay = isDateAfterOrEqualDays(eventStartAtISO, DAYS_REMINDER.one_day);
				if (messageReminderOneDay && !isOccasionEmpty && afterOrEqualOneDay) {
					await ReminderService.createReminder(
						{
							startAt,
							remindDT: startAt,
							registrationId,
							memberId,
							message: messageReminderOneDay,
							fullName: nameMember ?? '',
							telephone: companyTelephone,
							confirmationUrl: confirmationUrl,
							key: REMINDER_NOTIFY_TYPES.one_day,
							buildingInfo: buildingInfo,
							timeZone: TIME_ZONE_DEFAULT,
						},
						{
							replacerName,
							replacerBuilding,
							replacerConfirmationUrl,
							replacerDateTime,
							replacerTelephoneCompany,
						},
						transaction,
					);
				}
			}

			await transaction.commit();
		} catch (err) {
			console.error('20240728153242-migrate-member-for-sort', err);
			await transaction.rollback();
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction();
		try {
			await queryInterface.sequelize.query('DELETE FROM reminders', {
				type: Sequelize.QueryTypes.DELETE,
			});
			if (backupDataReminder.length > 0) {
				const insertPromises = backupDataReminder.map((row: any) => {
					const columns = Object.keys(row).join(', ');
					const values = Object.values(row)
						.map((value) => `'${value}'`)
						.join(', ');

					return queryInterface.sequelize.query(`INSERT INTO reminders (${columns}) VALUES (${values})`, {
						type: Sequelize.QueryTypes.INSERT,
						transaction,
					});
				});

				await Promise.all(insertPromises);
				await transaction.commit();
			}
		} catch (err) {
			console.error('20240728153242-migrate-member-for-sort', err);
			await transaction.rollback();
		}
	},
} satisfies Migration;
