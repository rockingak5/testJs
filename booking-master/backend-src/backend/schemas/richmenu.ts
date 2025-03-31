import { z } from 'zod';
import { RICH_MENU_ACTION_TYPE, RICH_MENU_TYPE, RICH_MENU_TYPES } from '../config';

export const createRichMenuSchema = z.object({
	name: z.string(),
	rmType: z.enum([RICH_MENU_TYPE.DEFAULT, RICH_MENU_TYPE.MEMBER]),
	image: z.object({
		fieldname: z.string(),
		originalname: z.string(),
		encoding: z.string(),
		mimetype: z.string(),
		buffer: z.instanceof(Buffer),
		size: z.number(),
	}),
	areas: z.array(
		z.object({
			bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
			action: z
				.object({
					type: z
						.enum([
							RICH_MENU_ACTION_TYPE.MEMBERSHIP,
							RICH_MENU_ACTION_TYPE.MESSAGE,
							RICH_MENU_ACTION_TYPE.TEL,
							RICH_MENU_ACTION_TYPE.URI,
						])
						.optional(),
					value: z.string().optional().optional(),
				})
				.optional(),
		}),
	),
	template: z.string(),
	size: z.array(z.number()).length(2),
});
export type CreateRichMenuSchema = z.infer<typeof createRichMenuSchema>;

export const richMenuAreaSchema = z.array(
	z.object({
		bounds: z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
		action: z.object({
			type: z.enum([
				RICH_MENU_ACTION_TYPE.MEMBERSHIP,
				RICH_MENU_ACTION_TYPE.MESSAGE,
				RICH_MENU_ACTION_TYPE.TEL,
				RICH_MENU_ACTION_TYPE.URI,
			]),
			value: z.string(),
		}),
	}),
);
export type RichMenuAreaSchema = z.infer<typeof richMenuAreaSchema>;

export const browseRichMenuQuerySchema = z.object({
	type: z.enum([RICH_MENU_TYPE.DEFAULT, RICH_MENU_TYPE.MEMBER]).optional(),
	isDisplayed: z.boolean().optional(),
});
export type BrowseRichMenuQuerySchema = z.infer<typeof browseRichMenuQuerySchema>;

export const updateRichMenuSchema = z.object({
	name: z.string().optional(),
	rmType: z.enum([RICH_MENU_TYPE.DEFAULT, RICH_MENU_TYPE.MEMBER]).optional(),
	image: z
		.union([
			z.object({
				fieldname: z.string(),
				originalname: z.string(),
				encoding: z.string(),
				mimetype: z.string(),
				buffer: z.instanceof(Buffer),
				size: z.number(),
			}),
			z.string(),
		])
		.optional(),
	areas: z
		.array(
			z.object({
				bounds: z.object({
					x: z.number(),
					y: z.number(),
					width: z.number(),
					height: z.number(),
				}),
				action: z
					.object({
						type: z
							.enum([
								RICH_MENU_ACTION_TYPE.MEMBERSHIP,
								RICH_MENU_ACTION_TYPE.MESSAGE,
								RICH_MENU_ACTION_TYPE.TEL,
								RICH_MENU_ACTION_TYPE.URI,
							])
							.optional(),
						value: z.string().optional().optional(),
					})
					.optional(),
			}),
		)
		.optional(),
	template: z.string().optional(),
	size: z.array(z.number()).length(2).optional(),
});
export type UpdateRichMenuSchema = z.infer<typeof updateRichMenuSchema>;
