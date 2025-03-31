import { Request, Response, NextFunction } from 'express';
import { FileOps } from '../utilities';
// export const multerFileEncodingFixer1 = (req: Request, res: Response, next: NextFunction) => {
//     let reqFiles = req.files as { categoryImages?: Express.Multer.File[] };
//     let images = reqFiles?.categoryImages ?? [];
//     if (images.length > 0) {
//         (req.files as { categoryImages: Express.Multer.File[] }).categoryImages = images.map(f => FileOps.changeEncodingLatin1ToUTF(f));
//     }
//     next();
// };
export const multerFileEncodingFixer = (filename: string, isArray: boolean) => {
	return (req: Request, res: Response, next: NextFunction) => {
		if (isArray && req.files) {
			const reqFiles = req.files as Record<string, Express.Multer.File[]>;
			// eslint-disable-next-line security/detect-object-injection
			const images = reqFiles[filename];
			if (images && images.length > 0)
				// eslint-disable-next-line security/detect-object-injection
				(req.files as Record<string, Express.Multer.File[]>)[filename] = images.map((f) =>
					FileOps.changeEncodingLatin1ToUTF(f),
				);
		} else if (req.file) {
			req.file = FileOps.changeEncodingLatin1ToUTF(req.file);
		}
		next();
	};
};
