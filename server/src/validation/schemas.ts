import { z } from "zod";

const videoId = z.string().regex(/^[A-Za-z0-9_-]{11}$/, "Invalid YouTube video ID");
const pageToken = z.string().min(1).max(2048).optional();

export const emptyQuery = z.object({}).strict();
export const emptyBody = z.object({}).strict().optional();

export const searchQuery = z
  .object({
    q: z.string().trim().min(1).max(200),
    pageToken,
  })
  .strict();

export const popularQuery = z
  .object({
    categoryId: z.string().regex(/^\d{1,4}$/).optional(),
    pageToken,
  })
  .strict();

export const videoIdParams = z.object({ videoId }).strict();
export const commentIdParams = z
  .object({ id: z.string().regex(/^[a-f\d]{24}$/i) })
  .strict();

export const registerBody = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
  })
  .strict();

export const loginBody = z
  .object({
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(72),
  })
  .strict();

export const savedVideoBody = z
  .object({
    videoId,
    title: z.string().trim().min(1).max(500),
    thumbnail: z.string().url().max(2048),
  })
  .strict();

export const commentBody = z
  .object({
    videoId,
    text: z.string().trim().min(1).max(1000),
    rating: z.number().int().min(1).max(5),
  })
  .strict();

export const statsQuery = emptyQuery;
