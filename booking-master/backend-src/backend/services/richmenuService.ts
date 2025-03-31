import { chunk, get } from 'lodash';
import path, { extname } from 'path';
import { Transaction } from 'sequelize';

import axios from 'axios';
import {
	BAD_REQUEST,
	CONFLICT_ERROR,
	RICH_MENU_ACTION_TYPE,
	RICH_MENU_TYPE,
	VALUE_KEY_MAP_BY_ACTION_TYPE,
	lineConfig,
	systemConfig,
} from '../config';
import { db } from '../models';
import type { BrowseRichMenuQuerySchema, CreateRichMenuSchema, UpdateRichMenuSchema } from '../schemas/richmenu';
import { AppError, FileOps } from '../utilities';
import { readBufferFromFile } from '../utilities/fileOperationsUtil';
import {
	deleteDefaultRichMenu,
	linkRichMenuToMultipleUsers,
	setDefaultRichMenu,
	unlinkRichMenusFromMultipleUsers,
} from './lineService';

export const unlinkRichMenu = async (type: RICH_MENU_TYPE) => {
	switch (type) {
		case RICH_MENU_TYPE.DEFAULT:
			return deleteDefaultRichMenu();

		case RICH_MENU_TYPE.MEMBER: {
			const users = await db.members.findAll({ attributes: ['lineId'] });
			const usersChunked = chunk(users, 500);
			for (const listUser of usersChunked) {
				await unlinkRichMenusFromMultipleUsers({
					userIds: listUser.filter((user) => user.lineId).map((user) => user.lineId) as string[],
				});
			}
			return users;
		}

		default:
			throw new AppError(BAD_REQUEST, 'invalid RichMenu type');
	}
};

export const linkRichMenu = async (richMenuId: string, type: RICH_MENU_TYPE) => {
	switch (type) {
		case RICH_MENU_TYPE.DEFAULT:
			return setDefaultRichMenu({ richMenuId });

		case RICH_MENU_TYPE.MEMBER: {
			const users = await db.members.findAll({ attributes: ['lineId'], where: { curRM: RICH_MENU_TYPE.MEMBER } });
			const usersChunked = chunk(users, 500);
			for (const listUser of usersChunked) {
				await linkRichMenuToMultipleUsers({
					richMenuId,
					userIds: listUser.filter((user) => user.lineId).map((user) => user.lineId) as string[],
				});
			}
			return users;
		}

		default:
			throw new AppError(BAD_REQUEST, 'invalid RichMenu type');
	}
};

export const getRichMenuHandler = async (id: number) => {
	return db.richmenus.findOne({
		where: { id },
	});
};

export const saveRichMenuImage = async (image: CreateRichMenuSchema['image'], type: CreateRichMenuSchema['rmType']) => {
	const picFileName = `xkakeru_${type}${new Date().getTime()}${extname(image.originalname)}`;

	return await FileOps.saveBufferToFile(
		image.buffer,
		path.join(systemConfig.PATH_FILE_UPLOAD, 'settings', picFileName),
		picFileName,
	);
};

export const deleteRichMenuImage = async (picUrl: string) => {
	return await FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD, 'settings', picUrl));
};

export const createRichMenuHandler = async (data: CreateRichMenuSchema, transaction: Transaction) => {
	const [width, height] = data.size;

	const picFileName = await saveRichMenuImage(data.image, data.rmType);

	const richMenuCreated = await db.richmenus.create(
		{
			isDisplayed: false,
			type: data.rmType,
			picUrl: picFileName,
			template: data.template,
			width,
			height,
			name: data.name as any,
			areas: data.areas,
		},
		{
			transaction,
		},
	);

	return richMenuCreated;
};

export const browseListRichMenuHandler = async (params: BrowseRichMenuQuerySchema) => {
	const data = await db.richmenus.findAll({
		where: params,
		order: [['createdAt', 'DESC']],
	});

	const total = await db.richmenus.count({
		where: params,
	});

	return { data, total };
};

export const deleteRichMenuHandler = async (id: string, transaction: Transaction) => {
	const richMenu = await db.richmenus.findByPk(id);

	if (!richMenu) {
		throw new AppError(BAD_REQUEST, 'RichMenu not found');
	}

	await deleteRichMenuImage(richMenu.picUrl);

	return await richMenu.destroy({ transaction });
};

export const updateRichMenuHandler = async (id: number, data: UpdateRichMenuSchema, transaction: Transaction) => {
	const richMenu = await db.richmenus.findByPk(id);

	if (!richMenu) {
		throw new AppError(BAD_REQUEST, 'RichMenu not found');
	}

	const { size, image, ...richMenuData } = data;
	const prevPicUrl = richMenu.picUrl;
	const isUpdateImage = image && typeof image !== 'string';

	if (isUpdateImage) {
		const picFileName = await saveRichMenuImage(image, data.rmType || richMenu.type);
		richMenu.set('picUrl', picFileName);
	}

	const updatedData = {
		...richMenuData,
		...(size
			? {
					width: size[0],
					height: size[1],
			  }
			: {}),
		...(data.rmType ? { type: data.rmType } : {}),
	};

	Object.keys(updatedData).forEach((key) => {
		const value = get(updatedData, key);
		if (value) richMenu.set(key as any, value);
	});

	const result = await richMenu.save({ transaction });

	if (isUpdateImage) {
		await deleteRichMenuImage(prevPicUrl);
	}

	return result;
};

export const publishRichMenuHandler = async (id: number, transaction: Transaction) => {
	const richMenu = await getRichMenuHandler(id);

	if (!richMenu) {
		throw new AppError(BAD_REQUEST, 'RichMenu not found');
	}

	const listRichMenuPublished = await browseListRichMenuHandler({
		isDisplayed: true,
		type: richMenu.type,
	});

	if (listRichMenuPublished.total) {
		throw new AppError(
			CONFLICT_ERROR,
			'もう公開しているリッチメニューがあります。そのリッチメニューを非公開して、再公開して下さい。',
		);
	}

	const areas = richMenu.areas
		.map(({ bounds, action }) => {
			return {
				bounds,
				action: action
					? {
							type: [RICH_MENU_ACTION_TYPE.MEMBERSHIP, RICH_MENU_ACTION_TYPE.TEL].includes(action.type)
								? RICH_MENU_ACTION_TYPE.URI
								: action.type,
							[VALUE_KEY_MAP_BY_ACTION_TYPE[action.type as keyof typeof VALUE_KEY_MAP_BY_ACTION_TYPE]]: [
								action.type === RICH_MENU_ACTION_TYPE.TEL ? 'tel:' : null,
								action.value,
							]
								.filter(Boolean)
								.join(''),
					  }
					: action,
			};
		})
		.filter((area) => area.action !== undefined);

	const { richMenuId } = await axios
		.post<{ richMenuId: string }>(
			'https://api.line.me/v2/bot/richmenu',
			{
				size: { width: richMenu.width, height: richMenu.height },
				name: richMenu.name,
				chatBarText: 'メニュー',
				areas,
				selected: true,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${lineConfig.LINE_CHANNEL_ACCESS_TOKEN}`,
				},
			},
		)
		.then((res) => res.data)
		.catch((e) => {
			return Promise.reject(e);
		});

	const image = await readBufferFromFile(path.join(systemConfig.PATH_FILE_UPLOAD_SETTING, richMenu.picUrl));

	await axios({
		method: 'POST',
		url: `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
		headers: {
			'Content-Type': 'image/png',
			Authorization: `Bearer ${lineConfig.LINE_CHANNEL_ACCESS_TOKEN}`,
		},
		data: image,
	});

	await richMenu.update(
		{
			isDisplayed: true,
			richMenuId,
		},
		{
			transaction,
		},
	);

	await linkRichMenu(richMenuId, richMenu.type);

	return richMenu;
};

export const unpublishRichMenuHandler = async (id: number, transaction: Transaction) => {
	const richMenu = await getRichMenuHandler(id);

	if (!richMenu) {
		throw new AppError(BAD_REQUEST, 'RichMenu not found');
	}

	await richMenu.update(
		{
			isDisplayed: false,
			richMenuId: null,
		},
		{
			transaction,
		},
	);

	await unlinkRichMenu(richMenu.type);

	return richMenu;
};
