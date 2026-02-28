import { z } from "zod";

export const videoFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  duration: z.number(),
  url: z.string(),
  type: z.string(),
  color: z.string(),
});

export const chunkSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  videoUrl: z.string(),
  videoName: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  color: z.string(),
});

export type VideoFile = z.infer<typeof videoFileSchema>;
export type Chunk = z.infer<typeof chunkSchema>;
