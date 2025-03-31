import { z } from 'zod';

export const batchUpdateDisplayCategoriesSchema = z.object({
	isDisplayed: z.boolean(),
});
export type BatchUpdateDisplayCategoriesSchema = z.infer<typeof batchUpdateDisplayCategoriesSchema>;
