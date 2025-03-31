/* eslint-disable security/detect-non-literal-fs-filename */
import fs = require('fs');
import { default as writeLog } from './loggerUtil';

export const deleteFile = async (filepath: string) =>
	fs.promises.unlink(filepath).catch((err) => writeLog({ msg: 'err deleteFile', err: err }, 'error'));

export const saveBufferToFile = async (buffer: Buffer, filepath: string, filename: string) =>
	fs.promises
		.writeFile(filepath, buffer)
		.then(() => filename)
		.catch((e) => {
			writeLog({ msg: 'err saveBufferToFile', datatype: typeof buffer, filepath: filepath, e: e }, 'error');
			return filename;
		});

export const readBufferFromFile = async (filepath: string) => fs.promises.readFile(filepath);

export const changeEncodingLatin1ToUTF = (f: Express.Multer.File) => {
	// eslint-disable-next-line no-control-regex
	if (!/[^\u0000-\u00ff]/.test(f.originalname)) {
		f.originalname = Buffer.from(f.originalname, 'latin1').toString('utf8');
	}
	return f;
};
