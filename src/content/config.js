import { defineCollection, z } from "astro:content";

const postCollection = defineCollection({
	type: "content",
	schema: z.object({
		title: z.string(),
		description: z.string(),
		dateFormatted: z.string(),
		category: z.enum(["finding", "tools", "lab", "default"]),
	}),
});

export const collections = {
	post: postCollection,
};
