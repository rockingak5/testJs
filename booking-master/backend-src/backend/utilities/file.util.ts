import fs = require('fs');

type IDefaultThrower = (e: string | undefined) => void;
const defaultErrorThrower: IDefaultThrower = (e) => {
	throw new Error(e);
};
export class FileUtility {
	static checkAndCreateDirectorySync = async (dirPath: string) =>
		fs.existsSync('public/uploads/') ? fs.mkdirSync('public/uploads/', { recursive: true }) : dirPath;

	static makeDirectory = async (dirPath: string) => fs.promises.mkdir(dirPath, { recursive: true });

	static deleteFile = async (filepath: string, cb = defaultErrorThrower) =>
		fs.promises.unlink(filepath).catch((e) => {
			if (e.code === 'ENOENT') return;
			return cb(e);
		});

	static saveBufferToFile = async (
		buffer: Buffer,
		filepath: string,
		filename: string,
		cb: CallableFunction = defaultErrorThrower,
	) =>
		fs.promises
			.writeFile(filepath, buffer)
			.then(() => filename)
			.catch((e) => {
				cb(e);
				return filename;
			});

	static readBufferFromFile = async (filepath: string) => fs.promises.readFile(filepath);

	static changeEncodingLatin1ToUTF = (f: Express.Multer.File) => {
		// eslint-disable-next-line no-control-regex
		if (!/[^\u0000-\u00ff]/.test(f.originalname)) {
			f.originalname = Buffer.from(f.originalname, 'latin1').toString('utf8');
		}
		return f;
	};

	static ensureDirectoryExists = (dirPath: string) => {
		if (!fs.existsSync(dirPath)) {
			fs.mkdirSync(dirPath, { recursive: true });
		}
	};
}
