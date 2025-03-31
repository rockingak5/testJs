import { z } from 'zod';

export const captureTransactionSchema = z.object({
	order_id: z.string(),
	amount: z.number(),
	dummy: z.boolean().optional(),
});
export type CaptureTransactionSchema = z.infer<typeof captureTransactionSchema>;

export const cancelTransactionSchema = z.object({
	order_id: z.string(),
	amount: z.number(),
	dummy: z.boolean().optional(),
});
export type CancelTransactionSchema = z.infer<typeof cancelTransactionSchema>;
