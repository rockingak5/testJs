import axios, { AxiosResponse } from 'axios';
import { nanoid } from 'nanoid';
import { db } from '../../models';
import { paymentKeyQueryValidator, type PaymentKeyQuery } from './payment-key.schema';
import { PAYMENT_TYPE } from '../../config';

export const getPopPaymentKey = async (
	data: Pick<PaymentKeyQuery, 'amount' | 'memberId' | 'occurrenceId'>,
): Promise<{ paymentKey: string }> => {
	const orderId = nanoid(20);

	const parsed = paymentKeyQueryValidator.parse({
		...data,
		popServerKey: process.env.VERITRANS_POP_SERVER_KEY,
		pushUrl: [
			//
			process.env.HOST,
			'api/webhook/veritrans/occurrences',
		]
			.filter(Boolean)
			.join('/'),
	});

	const res = await axios.post<
		any,
		AxiosResponse<{
			payment_key: string;
			result_code: string;
			status: string;
			message: string;
			payment_key_expiry_time: string;
		}>
	>(
		'https://pay.veritrans.co.jp/pop/v1/payment-key',
		{
			order_id: orderId,
			gross_amount: parsed.amount,
			dummy: process.env.NODE_ENV === 'development',
			// push_url: process.env.HOST + '/api/webhook/veritrans'
			push_url: parsed.pushUrl,
		},
		{
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				Authorization: 'Basic ' + Buffer.from(parsed.popServerKey + ':').toString('base64'),
			},
		},
	);

	await db.transaction.create({
		orderId,
		amount: parsed.amount,
		memberId: parsed.memberId,
		paymentKeyExpiryTime: res.data.payment_key_expiry_time,
		type: PAYMENT_TYPE.PURCHASE,
		occurrenceId: parsed.occurrenceId,
	});

	return {
		paymentKey: res.data.payment_key,
	};
};
