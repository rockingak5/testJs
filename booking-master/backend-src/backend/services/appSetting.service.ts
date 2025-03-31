import { Attributes, CreationAttributes, Transaction, WhereAttributeHash } from 'sequelize';
import { db } from '../models';
import type { SystemSetting } from '~models/systemSettingModel';

export class AppSettingService {
	//METHODS
	static async createSettings(params: CreationAttributes<SystemSetting>, transaction?: Transaction) {
		return db.systemSettings.create(
			{
				label: params.label,
				name: params.name,
				valueString: params.valueString,
				isPublic: params.isPublic,
			},
			{ transaction },
		);
	}
	static async findOrCreateSetting(
		{ label: settingLabel, valueString: settingValue }: CreationAttributes<SystemSetting>,
		transaction?: Transaction,
	) {
		return db.systemSettings.findOrCreate({
			where: { label: settingLabel, valueString: settingValue },
			transaction,
		});
	}
	static async findSetting(params: { settingLabel?: string; settingValue?: string }, transaction?: Transaction) {
		const settingWhere: WhereAttributeHash = {};
		if (params.settingLabel) settingWhere.settingLabel = params.settingLabel;
		if (params.settingValue) settingWhere.settingValue = params.settingValue;
		return db.systemSettings.findOne({ where: settingWhere, transaction });
	}
	static async getSetting(settingWhere: WhereAttributeHash<Attributes<SystemSetting>>, transaction?: Transaction) {
		return db.systemSettings.findOne({ where: settingWhere, transaction });
	}
	static async updateSettings(
		settingWhere: WhereAttributeHash<Attributes<SystemSetting>>,
		params: CreationAttributes<SystemSetting>,
		transaction?: Transaction,
	) {
		return db.systemSettings.update(params, {
			where: settingWhere,
			transaction,
		});
	}
	static async deleteSettings(settingWhere: WhereAttributeHash<Attributes<SystemSetting>>, transaction?: Transaction) {
		return (
			(await db.systemSettings.destroy({
				where: settingWhere,
				transaction,
			})) > 0
		);
	}
}
