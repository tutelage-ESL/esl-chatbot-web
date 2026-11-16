import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, "Search query must be at least 2 characters").max(100),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
