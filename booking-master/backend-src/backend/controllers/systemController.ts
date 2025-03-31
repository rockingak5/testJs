import { NextFunction, Request, Response } from 'express';
import path = require('path');
import { CreationAttributes } from 'sequelize';
import { RESPONSE_SUCCESS, systemConfig, SYSTEM_ERROR, BAD_REQUEST } from '../config';
import { AppError, FileOps } from '../utilities';
import { db } from '../models/index';
import { SystemSetting } from '../models/systemSettingModel';
import { SettingService, SocketServerService } from '../services';

export const getSystemSettings = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const settings = await db.systemSettings.getSettings();
		res.send(settings);
	} catch (e) {
		next(e);
	}
};

export const getSystemSetting = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const key = req.params.key;
		if (!key) {
			throw new AppError(SYSTEM_ERROR, 'invalid key', false);
		}
		const setting = await db.systemSettings.findSettings(key);
		res.send(setting);
	} catch (e) {
		next(e);
	}
};

export const getPublicSettings = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const sysSettings = await db.systemSettings.findPublicSettings();
		res.send(sysSettings);
	} catch (e) {
		next(e);
	}
};

export const setBulkSystemSettings = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const settings = req.body.settings as CreationAttributes<SystemSetting>[];
		if (!settings || settings.length == 0) {
			throw new AppError(SYSTEM_ERROR, 'invalid parameters');
		}
		await SettingService.updateSettingsInBulk(settings).then(() => {
			SocketServerService.emitSystemSetting({ keys: settings.map((s) => s.name) });
			res.sendStatus(RESPONSE_SUCCESS);
		});
	} catch (e) {
		next(e);
	}
};

export const setSystemSettings = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const key = req.params.key;
		if (!key) {
			throw new AppError(BAD_REQUEST, 'invalid key', false);
		}
		const {
			label,
			valueFlag,
			valueString = null,
			valueNumber = null,
			isPublic,
		} = req.body as {
			label: string;
			valueFlag?: boolean;
			valueString?: string;
			valueNumber?: number;
			isPublic?: boolean;
		};
		let setting = await db.systemSettings.findByPk(key);
		if (setting == null) {
			setting = await db.systemSettings.create({
				name: key,
				label: label,
				valueFlag: valueFlag,
				valueString: valueString,
				valueNumber: valueNumber,
				isPublic: isPublic,
			});
		} else {
			setting.set({
				label: label,
				valueFlag: valueFlag,
				valueString: valueString,
				valueNumber: valueNumber,
				isPublic: isPublic,
			});
			if (setting.changed()) {
				setting = await setting.save();
			}
		}
		SocketServerService.emitSystemSetting({ keys: [key] });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};

export const deleteSettings = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const key = req.params.key;
		if (!key) {
			throw new AppError(SYSTEM_ERROR, 'invalid key', false);
		}
		await db.systemSettings.deleteSettings(key);
		SocketServerService.emitSystemSetting({ keys: [key] });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};

export const getFavicon = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const favicon = await db.systemSettings.findFavicon();
		res.send(favicon?.valueString ?? null);
	} catch (e) {
		next(e);
	}
};

export const setFavicon = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.file || !req.file.filename) {
			throw new AppError(SYSTEM_ERROR, 'no favicon file', false);
		}
		if (!req.file.filename.endsWith('.ico')) {
			await FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SETTING, req.file.filename)).then(() => {
				throw new AppError(SYSTEM_ERROR, `wrong file format ${req.file?.filename}`);
			});
		}
		let favicon = await db.systemSettings.findOne({ where: { name: 'favicon' } });
		if (favicon == null) {
			favicon = await db.systemSettings.createSettings({
				name: 'favicon',
				label: 'ファビコン',
				valueString: req.file.filename,
			});
		} else {
			if (favicon.valueString != null) {
				await FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SETTING, favicon.valueString));
			}
			await favicon.update({
				label: 'ファビコン',
				valueString: req.file.filename,
			});
		}
		SocketServerService.emitFavicon({ favicon: req.file.filename });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};

export const getLogo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const logo = await db.systemSettings.findLogo();
		res.send(logo?.valueString ?? null);
	} catch (e) {
		next(e);
	}
};

export const setLogo = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.file || !req.file.filename) {
			throw new AppError(SYSTEM_ERROR, 'no logo file', false);
		}
		let logo = await db.systemSettings.findOne({ where: { name: 'logo' } });
		if (logo == null) {
			logo = await db.systemSettings.createSettings({
				name: 'logo',
				label: 'ロゴ',
				valueString: req.file.filename,
			});
		} else {
			if (logo.valueString != null) {
				await FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SETTING, logo.valueString));
			}
			await logo.update({
				label: 'ロゴ',
				valueString: req.file.filename,
			});
		}
		SocketServerService.emitLogo({ logo: req.file.filename });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};

export const getStorePic = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const logo = await db.systemSettings.findStorePic();
		res.send(logo?.valueString ?? null);
	} catch (e) {
		next(e);
	}
};

export const setStorePic = async (req: Request, res: Response, next: NextFunction) => {
	try {
		if (!req.file || !req.file.filename) {
			throw new AppError(SYSTEM_ERROR, 'no store pic file', false);
		}
		let storePic = await db.systemSettings.findOne({ where: { name: 'storePic' } });
		if (storePic == null) {
			storePic = await db.systemSettings.createSettings({
				name: 'storePic',
				label: '店舗画像',
				valueString: req.file.filename,
			});
		} else {
			if (storePic.valueString != null) {
				await FileOps.deleteFile(path.join(systemConfig.PATH_FILE_UPLOAD_SETTING, storePic.valueString));
			}
			await storePic.update({
				label: '店舗画像',
				valueString: req.file.filename,
			});
		}
		SocketServerService.emitStorePic({ storePic: req.file.filename });
		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		next(e);
	}
};

export const deleteStorePic = async (req: Request, res: Response, next: NextFunction) => {
	const transaction = await db.sequelize.transaction();
	try {
		await SettingService.deleteStorePicHandler(transaction);

		await transaction.commit();

		res.sendStatus(RESPONSE_SUCCESS);
	} catch (e) {
		await transaction.rollback();
		next(e);
	}
};
