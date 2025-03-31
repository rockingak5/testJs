import crypto from 'crypto';
import { paymentConfig } from '../config';

export function checkSignature(body: any) {
	if (!body && !('signature' in body)) {
		return false;
	}
	const sortedParams: any = {};
	Object.keys(body)
		.sort()
		.forEach((key) => {
			if (key !== 'signature') {
				sortedParams[key] = body[key];
			}
		});

	let inputString = '';
	for (const key in sortedParams) {
		if (inputString) {
			inputString += '&';
		}
		inputString += `${key}=${body[key]}`;
	}
	inputString += ':' + paymentConfig.VERITRANS_POP_SERVER_KEY;

	const sha256 = crypto.createHash('sha512');
	sha256.update(inputString);
	return body.signature === sha256.digest('hex');
}
