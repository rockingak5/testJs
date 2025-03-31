import { Action, Area, RichMenu } from '@line/bot-sdk';
import { Attributes, CreationAttributes, FindOptions, Transaction, WhereAttributeHash } from 'sequelize';
import { systemConfig } from '../config';
import { db } from '../models';
import { Member } from '~models/memberModel';
import { Richmenu } from '~models/richmenuModel';
import { getBot } from './linebot.service';
const botClient = getBot();
export class RichmenuService {
	static async createRichmenu(params: CreationAttributes<Richmenu>, transaction?: Transaction) {
		return db.richmenus.create(params, { transaction });
	}
	static async getRichmenu(richmenuWhere: WhereAttributeHash<Attributes<Richmenu>>, options: FindOptions = {}) {
		return db.richmenus.findOne({ where: richmenuWhere, ...options });
	}

	static async listRichmenus(richmenuWhere: WhereAttributeHash<Attributes<Richmenu>>, options: FindOptions = {}) {
		return db.richmenus.findAll({ where: richmenuWhere, ...options });
	}
	static async setCustomerRichmenu(customer: Member | { lineId: string; telephone?: string }) {
		//check if customer has registered email | telephone
		//if yes connect end richmenu
		if (customer.telephone) {
			const isRegiMenu = await RichmenuService.getRichmenu({
				name: 'isRegistered',
			});
			if (isRegiMenu == null || !isRegiMenu.richMenuId) return;
			await botClient.linkRichMenuToUser(customer.lineId as string, isRegiMenu.richMenuId);
		} else {
			//if not connect start richmenu
			const notRegiMenu = await RichmenuService.getRichmenu({
				name: 'notRegistered',
			});
			if (notRegiMenu == null || !notRegiMenu.richMenuId) return;
			await botClient.linkRichMenuToUser(customer.lineId as string, notRegiMenu.richMenuId);
		}
		return;
	}
	static async unsetCustomerRichmenu(customer: Member) {
		return botClient.unlinkRichMenuFromUser(customer.lineId as string);
	}
	static buildRichmenu({ width, height, name }: { width: number; height: number; name: string }): RichMenu {
		return {
			size: {
				width: width,
				height: height,
			},
			selected: false,
			name: name,
			chatBarText: 'メニュー',
			areas: [],
		};
	}
	static buildRichmenuAreas(
		{ y, width, btnHeight }: { y: number; width: number; btnHeight: number },
		{ link1 }: { link1: string },
	): {
		bounds: Area;
		action: Action<{
			label?: string | undefined;
		}>;
	}[] {
		return [
			{
				bounds: {
					x: 0,
					y: y,
					width: width / 2,
					height: btnHeight,
				},
				action: { type: 'uri', uri: link1 },
			},
			{
				bounds: {
					x: width / 2,
					y: y,
					width: width / 2,
					height: btnHeight,
				},
				action: {
					type: 'uri',
					uri: `https://${systemConfig.LINE.LINE_LIFF_URI}`,
				},
			},
		];
	}
	static buildRichmenuAreasNoLinks({ y, width, btnHeight }: { y: number; width: number; btnHeight: number }): {
		bounds: Area;
		action: Action<{
			label?: string | undefined;
		}>;
	}[] {
		return [
			{
				bounds: { x: 0, y: y, width: width, height: btnHeight },
				action: {
					type: 'uri',
					uri: `https://${systemConfig.LINE.LINE_LIFF_URI}`,
				},
			},
		];
	}
}
