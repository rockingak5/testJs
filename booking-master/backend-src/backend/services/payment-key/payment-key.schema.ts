import { z } from 'zod';

export const paymentKeyQueryValidator = z.object({
	amount: z.number().min(1),
	pushUrl: z.string().url(),
	popServerKey: z.string().min(1, { message: 'popServerKey is required' }),
	memberId: z.number(),
	occurrenceId: z.number(),
});

export type PaymentKeyQuery = z.infer<typeof paymentKeyQueryValidator>;
