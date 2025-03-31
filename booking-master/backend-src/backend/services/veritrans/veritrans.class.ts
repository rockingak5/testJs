import axios, { AxiosInstance } from 'axios';
import { CancelTransactionSchema, cancelTransactionSchema } from './veritrans.schema';

class Veritrans {
	private axios: AxiosInstance;
	private dummy: boolean;

	constructor() {
		this.dummy = process.env.NODE_ENV !== 'production';
		this.axios = axios.create({
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				Authorization: `Basic ${Buffer.from(process.env.VERITRANS_POP_SERVER_KEY + ':').toString('base64')}`,
			},
		});
	}

	cancelTransaction(data: Omit<CancelTransactionSchema, 'dummy'>) {
		const parsed = cancelTransactionSchema.parse({
			...data,
			dummy: this.dummy,
		});

		return this.axios.post('https://pay3.veritrans.co.jp/pop/v1/card-cancel', {
			...parsed,
			amount: Math.round(parsed.amount),
		});
	}
}

export default new Veritrans();
