import { CreationAttributes, DataTypes, Op, Transaction, WhereAttributeHashValue, WhereOptions, col } from 'sequelize';
import path from 'path';

import { BAD_REQUEST, CUSTOMER_REGISTRATION_TYPES, SYSTEM_ERROR, SYSTEM_SETTING_KEYS, systemConfig } from '../config';
import { db } from '../models';
import { CampaignChoice } from '../models/campaignChoiceModel';
import { SystemSetting } from '../models/systemSettingModel';
import { AppError, FileOps } from '../utilities';
import { CustomerRegistration } from '~models/customerRegistrationModel';
import { uniq, differenceBy, intersectionBy, set } from 'lodash';
import { MemberService, SocketServerService } from '~services';

export const getRegistrationAndReminderMessages = async (transaction?: Transaction) => {
	const reminderMessages = await db.systemSettings.findAll({
		where: {
			name: {
				[Op.in]: [
					'bookRegistrationMessage',
					'bookRemind1Message',
					'bookRemind2Message',
					'bookConfirmUrl',
					'companyTelephone',
					'campaignApplyMessage',
				],
			},
		},
		transaction,
	});

	return {
		remind1: reminderMessages.find((r) => r.name == 'bookRemind1Message') ?? null,
		remind2: reminderMessages.find((r) => r.name == 'bookRemind2Message') ?? null,
		regiMessage: reminderMessages.find((r) => r.name == 'bookRegistrationMessage') ?? null,
		bookConfirmationUrl: reminderMessages.find((r) => r.name == 'bookConfirmUrl') ?? null,
		companyTelephoneForTemplate: reminderMessages.find((r) => r.name == 'companyTelephone') ?? null,
		campaignregiMessage: reminderMessages.find((r) => r.name == 'campaignApplyMessage') ?? null,
	};
};

export const getSpectatorNotificationTemplates = async (transaction?: Transaction) => {
	const spectatorNotificationTemplates = await db.systemSettings.findAll({
		where: {
			name: {
				[Op.in]: [
					'watchMemberTemplate',
					'watchRegistrationTemplate',
					'watchRegistrationCancelTemplate',
					'watchCampaignApplyTemplate',
				],
			},
		},
		transaction,
	});
	return {
		watchMemberTemplate: spectatorNotificationTemplates.find((t) => t.name == 'watchMemberTemplate') ?? null,
		watchRegistrationTemplate:
			spectatorNotificationTemplates.find((t) => t.name == 'watchRegistrationTemplate') ?? null,
		watchRegistrationCancelTemplate:
			spectatorNotificationTemplates.find((t) => t.name == 'watchRegistrationCancelTemplate') ?? null,
		watchCampaignApplyTemplate:
			spectatorNotificationTemplates.find((t) => t.name == 'watchCampaignApplyTemplate') ?? null,
	};
};

export const getSpectatorNotificationTemplate = async (key: string, transaction?: Transaction) =>
	db.systemSettings.findByPk(key, { transaction });

export const getBookingDeadline = async (transaction?: Transaction) => {
	const bookingSettings = await db.systemSettings.findAll({
		where: {
			name: { [Op.substring]: 'bookLimit' },
		},
		transaction,
	});
	const isEnabled = bookingSettings.find((bs) => bs.name == 'bookLimitEnabled')?.valueFlag ?? null;
	const days = bookingSettings.find((bs) => bs.name == 'bookLimitDay')?.valueNumber ?? null;
	const hours = bookingSettings.find((bs) => bs.name == 'bookLimitHour')?.valueNumber ?? null;
	const minutes = bookingSettings.find((bs) => bs.name == 'bookLimitMinute')?.valueNumber ?? null;
	if (bookingSettings.length == 0 || isEnabled == null || days == null || hours == null || minutes == null) {
		return null;
	}
	return {
		isEnabled: isEnabled,
		days: days,
		hours: hours,
		minutes: minutes,
	} as bookingDeadlineType;
};

export const getBookingCancelDeadline = async (
	transaction?: Transaction,
): Promise<cancelBookingDeadlineType | null> => {
	const cancelSettings = await db.systemSettings.findAll({
		where: {
			name: {
				[Op.or]: [{ [Op.substring]: 'bookCancelLimit' }, { [Op.eq]: 'bookCancelAllowed' }],
			},
		},
		transaction,
	});
	const days = cancelSettings.find((cs) => cs.name == 'bookCancelLimitDay')?.valueNumber ?? null;
	const hours = cancelSettings.find((cs) => cs.name == 'bookCancelLimitHour')?.valueNumber ?? null;
	const minutes = cancelSettings.find((cs) => cs.name == 'bookCancelLimitMinute')?.valueNumber ?? null;
	const isAllowed = cancelSettings.find((cs) => cs.name == 'bookCancelAllowed')?.valueFlag ?? false;
	if (cancelSettings.length == 0 || days == null || hours == null || minutes == null) {
		return null;
	}
	return {
		isAllowed: isAllowed,
		days: days,
		hours: hours,
		minutes: minutes,
	};
};

export const getCampaignApplyMessage = async (transaction?: Transaction) => {
	const settings = await db.systemSettings.findAll({
		where: {
			name: {
				[Op.in]: ['campaignApplyMessage', 'companyTelephone'],
			},
		},
		transaction,
	});
	const campaignApplyMessage = settings.find((s) => s.name == 'campaignApplyMessage');
	const companyTelephone = settings.find((s) => s.name == 'companyTelephone');
	return {
		campaignApplyMessage: campaignApplyMessage?.valueString ?? '',
		companyTelephone: companyTelephone?.valueString ?? '',
	};
};

export const updateSettingsInBulk = async (
	settings: CreationAttributes<SystemSetting>[],
	transaction?: Transaction,
) => {
	return db.systemSettings.bulkCreate(settings, {
		updateOnDuplicate: ['label', 'valueFlag', 'valueNumber', 'valueString', 'isPublic'],
		transaction,
	});
};

export const listCustomerRegistrations = async (
	where?: WhereOptions<CustomerRegistration>,
	transaction?: Transaction,
) => {
	const customerRegistrations = await db.customerRegistrations.findAll({
		where,
		include: {
			association: db.customerRegistrations.associations.campaignChoices,
			attributes: { exclude: ['customerRegistrationId'] },
		},
		order: [
			['showOrder', 'asc'],
			[db.campaignChoices, col('showOrder'), 'asc'],
		],
		transaction,
	});

	const customerRegistrationsCheckBoxOrRadio = customerRegistrations.filter((cr) =>
		[CUSTOMER_REGISTRATION_TYPES.CHECKBOX, CUSTOMER_REGISTRATION_TYPES.RADIO].includes(cr.type),
	);
	const attributesMembers = customerRegistrationsCheckBoxOrRadio.map(
		(it) => `customerRegistrationId${it.customerRegistrationId}`,
	);
	const members = await db.members.findAll({
		where: { lineId: { [Op.ne]: null } },
		...(attributesMembers.length
			? {
					attributes: [...attributesMembers, 'memberId'],
			  }
			: {}),
		raw: true,
	});
	const customerRegistrationCheck = customerRegistrations.map((customerRegistrationDb) => {
		const customerRegistration = customerRegistrationDb.toJSON() as CustomerRegistration;

		if (![CUSTOMER_REGISTRATION_TYPES.CHECKBOX, CUSTOMER_REGISTRATION_TYPES.RADIO].includes(customerRegistration.type))
			return customerRegistration;

		const { campaignChoices = [] } = customerRegistration;
		const column = `customerRegistrationId${customerRegistration.customerRegistrationId}`;
		const campaignChoiceIdsNotDelete: number[] = [];

		members.forEach((member: any) => {
			const columnMemberValue = member[column];
			if (!columnMemberValue) return;

			if (Array.isArray(columnMemberValue)) {
				const campaignChoiceIds = columnMemberValue.map((it) => it.checked);
				campaignChoiceIdsNotDelete.push(...campaignChoiceIds);
			} else {
				const campaignChoiceId = columnMemberValue.checked;
				campaignChoiceIdsNotDelete.push(campaignChoiceId);
			}
		});
		const campaignChoiceIdsUniq = uniq(campaignChoiceIdsNotDelete);
		const newCampaignChoice = campaignChoices.map((it) => {
			let isDelete = true;
			if (campaignChoiceIdsUniq.includes(it.campaignChoiceId)) {
				isDelete = false;
			}
			return { ...it, isDelete };
		});
		return {
			...customerRegistration,
			campaignChoices: newCampaignChoice,
		};
	});
	return customerRegistrationCheck;
};

export const createCustomerRegistration = async ({
	required = false,
	isDisplayed = false,
	isAdminDisplayed = false,
	label,
	type,
	choices,
	transaction,
}: {
	required: boolean;
	isDisplayed: boolean;
	isAdminDisplayed: boolean;
	label: string;
	type: string;
	choices: CreationAttributes<CampaignChoice>[];
	transaction?: Transaction;
}) => {
	const maxShowOrder: any = await db.customerRegistrations.max('showOrder');

	const cq = await db.customerRegistrations.create(
		{
			required,
			label: label?.trim(),
			type: type?.trim(),
			isDisplayed,
			showOrder: maxShowOrder + 1 || 0,
			isAdminDisplayed,
		},
		{ transaction },
	);

	const isOption = ['radio', 'checkbox'].includes(type);

	const queryInterface = db.sequelize.getQueryInterface();

	await queryInterface.addColumn(
		'members',
		`customerRegistrationId${cq.customerRegistrationId}`,
		{
			type: isOption ? DataTypes.JSON : DataTypes.STRING,
			defaultValue: isOption ? {} : null,
			allowNull: true,
		},
		{ transaction },
	);

	const result = await db.campaignChoices.bulkCreate(
		choices.map((c, i) => ({
			contents: c.contents,
			showOrder: c.showOrder ?? i,
			customerRegistrationId: cq.customerRegistrationId,
			type: c.type,
		})),
		{ fields: ['customerRegistrationId', 'contents', 'showOrder', 'type'], transaction },
	);

	return result;
};

export const updateCustomerRegistrationOrder = async (
	params: { customerRegistrationId: number; showOrder: number }[],
	transaction?: Transaction,
) =>
	db.customerRegistrations
		.findAll({
			where: { customerRegistrationId: { [Op.in]: params.map((p) => p.customerRegistrationId) } },
			transaction,
		})
		.then((customerRegistrations) =>
			Promise.all(
				customerRegistrations.map((c) => {
					const uc = params.find((p) => p.customerRegistrationId == c.customerRegistrationId);

					if (uc == undefined) {
						throw new Error(`uc not found ${c.customerRegistrationId}`);
					} else {
						return c.update({ showOrder: uc.showOrder }, { transaction });
					}
				}),
			),
		);

export const updateCustomerRegistration = async ({
	customerRegistrationId,
	required,
	isDisplayed,
	isAdminDisplayed,
	label,
	choices,
	transaction,
}: {
	customerRegistrationId: number;
	required: boolean;
	isDisplayed: boolean;
	isAdminDisplayed: boolean;
	label: string;
	choices: CreationAttributes<CampaignChoice>[];
	transaction?: Transaction;
}) => {
	try {
		const customerRegistration = await db.customerRegistrations.findByPk(customerRegistrationId, {
			include: { association: db.customerRegistrations.associations.campaignChoices },
			transaction,
		});
		if (customerRegistration == null) {
			throw new AppError(SYSTEM_ERROR, `customerRegistration ${customerRegistrationId} does not exist`);
		}
		customerRegistration.set({
			required,
			label: label?.trim(),
			isDisplayed,
			isAdminDisplayed,
		});
		if (customerRegistration.changed()) {
			await customerRegistration.save({ transaction });
		}

		const customerRegistrationJSON = customerRegistration.toJSON() as CustomerRegistration;

		if (
			[CUSTOMER_REGISTRATION_TYPES.CHECKBOX, CUSTOMER_REGISTRATION_TYPES.RADIO].includes(customerRegistrationJSON.type)
		) {
			const oldChoices = customerRegistrationJSON.campaignChoices ?? [];
			const newChoices = choices;
			const choicesRemain = intersectionBy(newChoices, oldChoices, 'campaignChoiceId');
			let isSendSocketMember = false;

			console.log('choicesRemain', choicesRemain);

			if (choicesRemain.length) {
				for (const choiceRemain of choicesRemain) {
					await db.campaignChoices.update(
						{ contents: choiceRemain.contents, showOrder: choiceRemain.showOrder },
						{ where: { campaignChoiceId: choiceRemain.campaignChoiceId }, transaction },
					);
				}
				const choicesChanged = choicesRemain.filter((newChoice) => {
					const oldChoice = oldChoices.find((it) => it.campaignChoiceId === newChoice.campaignChoiceId);
					return newChoice.contents !== oldChoice?.contents;
				});
				console.log('choicesChanged', choicesChanged);
				if (choicesChanged.length) {
					const atributesMembers = `customerRegistrationId${customerRegistrationJSON.customerRegistrationId}`;
					const members = await db.members.findAll({
						where: { lineId: { [Op.ne]: null } },
						attributes: [atributesMembers, 'memberId'],
						raw: true,
					});
					for (const choiceChanged of choicesChanged) {
						const newContents = choiceChanged.contents;
						const choiceId = choiceChanged.campaignChoiceId;

						for (const member of members as any) {
							const columnMemberValue = member[atributesMembers];
							if (!columnMemberValue) continue;
							if (Array.isArray(columnMemberValue)) {
								const memberCampaignChoiceValue = columnMemberValue.filter((it) => it.checked === choiceId);
								const memberCampaignChoiceIndex = columnMemberValue.findIndex((it) => it.checked === choiceId);
								if (memberCampaignChoiceValue.length) {
									memberCampaignChoiceValue[0].value = newContents;
									set(columnMemberValue, memberCampaignChoiceIndex, memberCampaignChoiceValue[0]);
								}
							} else {
								if (columnMemberValue.checked === choiceId) {
									columnMemberValue.value = newContents;
								}
							}
							await MemberService.updateCustomerRegistrationByMemberById(
								member.memberId,
								{
									[atributesMembers]: JSON.stringify(columnMemberValue),
								},
								transaction,
							);
							isSendSocketMember = true;
						}
					}
				}
			}
			if (isSendSocketMember) {
				SocketServerService.emitMember({ memberId: null });
			}
			const campaignChoicesRemove = differenceBy(oldChoices, newChoices, 'campaignChoiceId');
			if (campaignChoicesRemove.length) {
				const campaignChoiceRemoveIds = campaignChoicesRemove.map((it) => it.campaignChoiceId) as any;
				await db.campaignChoices.destroy({
					where: { campaignChoiceId: { [Op.in]: campaignChoiceRemoveIds } },
					transaction,
				});
			}
			const campaignChoicesCreated = differenceBy(newChoices, oldChoices, 'campaignChoiceId');
			if (campaignChoicesCreated.length) {
				await db.campaignChoices.bulkCreate(
					campaignChoicesCreated.map((c, i) => ({
						contents: c.contents,
						showOrder: c.showOrder ?? i,
						customerRegistrationId,
						type: c.type,
					})),
					{ fields: ['customerRegistrationId', 'contents', 'showOrder', 'type'], transaction },
				);
			}
		}

		// if (customerRegistration?.isDelete) {
		// 	const oldChoices = customerRegistration.campaignChoices ?? [];
		// 	if (oldChoices.length > 0) {
		// 		await db.campaignChoices.destroy({ where: { customerRegistrationId }, transaction });
		// 	}
		// 	if (choices.length > 0) {
		// 		await db.campaignChoices.bulkCreate(
		// 			choices.map((c, i) => ({
		// 				contents: c.contents,
		// 				showOrder: c.showOrder ?? i,
		// 				customerRegistrationId,
		// 				type: c.type,
		// 			})),
		// 			{ fields: ['customerRegistrationId', 'contents', 'showOrder', 'type'], transaction },
		// 		);
		// 	}
		// }
		return true;
	} catch (error) {
		console.log(error);
	}

	return;
};
export const deleteCustomerRegistration = async (customerRegistrationId: number, transaction?: Transaction) => {
	const queryInterface = db.sequelize.getQueryInterface();
	await queryInterface.removeColumn('members', `customerRegistrationId${customerRegistrationId}`, { transaction });
	return db.customerRegistrations.destroy({ where: { customerRegistrationId }, transaction });
};

export const deleteStorePicHandler = async (transaction: Transaction) => {
	const storePic = await db.systemSettings.findOne({
		where: { name: SYSTEM_SETTING_KEYS.STORE_PIC },
	});

	if (!storePic) {
		throw new AppError(BAD_REQUEST, 'no store pic file');
	}

	if (storePic.valueString != null) {
		await FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SETTING, storePic.valueString));
	}

	return await storePic.destroy({ transaction });
};
