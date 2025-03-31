import path = require('path');
import pwgen = require('generate-password');
import multer = require('multer');
import { nanoid } from 'nanoid';

import { systemConfig } from '../config';
import { FileUtility } from '../utilities';

const getExType = (file: Express.Multer.File) => path.extname(file.originalname).toLocaleLowerCase();

const occasionStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, systemConfig.PATH_FILE_UPLOAD_OCCASION);
	},
	filename: (req, file, cb) => {
		cb(null, `${pwgen.generate({ length: 10, numbers: true })}${path.extname(file.originalname)}`);
	},
});

const categoryStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, systemConfig.PATH_FILE_UPLOAD_CATEGORY);
	},
	filename: (req, file, cb) => {
		cb(null, `${pwgen.generate({ length: 10, numbers: true })}${path.extname(file.originalname)}`);
	},
});

const settingStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, systemConfig.PATH_FILE_UPLOAD_SETTING);
	},
	filename: (req, file, cb) => {
		cb(null, `${pwgen.generate({ length: 10, numbers: true })}${path.extname(file.originalname)}`);
	},
});
const memberStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, systemConfig.PATH_FILE_UPLOAD_MEMBER);
	},
	filename: (req, file, cb) => {
		cb(null, `${pwgen.generate({ length: 10, numbers: true })}${path.extname(file.originalname)}`);
	},
});

const memStorage = multer.memoryStorage();

export const memberUploadImage = multer({
	storage: memberStorage,
	fileFilter: (req, file, cb) => {
		const fileFormat = getExType(file);
		if (['.jpg', '.jpeg', '.png'].includes(fileFormat)) {
			cb(null, true);
		} else {
			cb(null, false);
			return cb(new Error(`Only .png, .jpg, and .jpeg format allowed! current format ${fileFormat}`));
		}
	},
});

export const uploadImage = multer({
	storage: settingStorage,
	limits: {
		fileSize: 10 * 1024 * 1024,
		fieldSize: 10 * 1024 * 1024,
	},
	fileFilter: (req, file, cb) => {
		const fileFormat = getExType(file);
		if (['.jpg', '.jpeg', '.png', '.svg'].includes(fileFormat)) {
			cb(null, true);
		} else {
			cb(null, false);
			return cb(new Error(`Only .png, .svg, .jpg, and .jpeg format allowed! current format ${fileFormat}`));
		}
	},
});

export const uploadIco = multer({
	storage: settingStorage,
	fileFilter: (req, file, cb) => {
		const fileFormat = getExType(file);
		if (fileFormat == '.ico') {
			cb(null, true);
		} else {
			cb(null, false);
			return cb(new Error(`Only .ico format allowed! ${path.extname(file.originalname)}`));
		}
	},
});

export const uploadOccasion = multer({ storage: occasionStorage });
export const uploadCategoryPic = multer({ storage: categoryStorage });
export const richmenuUpload = multer({ storage: memStorage });

export const storageInquiries = multer.diskStorage({
	destination: (req, file, cb) => {
		FileUtility.checkAndCreateDirectorySync(systemConfig.PATH_FILE_UPLOAD_INQUIRIES);
		cb(null, systemConfig.PATH_FILE_UPLOAD_INQUIRIES);
	},
	filename: (req, file, cb) => {
		cb(null, `${pwgen.generate({ length: 10, numbers: true })}${path.extname(file.originalname)}`);
	},
});
export const uploadInquiries = multer({ storage: storageInquiries });

export const storageLotteries = multer.diskStorage({
	destination: (req, file, cb) => {
		FileUtility.checkAndCreateDirectorySync(systemConfig.PATH_FILE_UPLOAD_LOTTERIES);
		cb(null, systemConfig.PATH_FILE_UPLOAD_LOTTERIES);
	},
	filename: (req, file, cb) => {
		cb(null, `${pwgen.generate({ length: 10, numbers: true })}${path.extname(file.originalname)}`);
	},
});
export const uploadLotteries = multer({ storage: storageLotteries });

export const storageCoupons = multer.diskStorage({
	destination: (req, file, cb) => {
		FileUtility.checkAndCreateDirectorySync(systemConfig.PATH_FILE_UPLOAD_COUPONS);
		cb(null, systemConfig.PATH_FILE_UPLOAD_COUPONS);
	},
	filename: (req, file, cb) => {
		cb(null, `${pwgen.generate({ length: 10, numbers: true })}${path.extname(file.originalname)}`);
	},
});
export const uploadCoupons = multer({ storage: storageCoupons });

export const storageSurvey = multer.diskStorage({
	destination: (req, file, cb) => {
		FileUtility.ensureDirectoryExists(systemConfig.PATH_FILE_UPLOAD_SURVEY);
		cb(null, systemConfig.PATH_FILE_UPLOAD_SURVEY);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = nanoid();
		const fileExtension = path.extname(file.originalname);
		cb(null, `${uniqueSuffix}${fileExtension}`);
	},
});
export const uploadSurvey = multer({ storage: storageSurvey });
