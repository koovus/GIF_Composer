import { z } from "zod";

export const videoFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  duration: z.number(),
  url: z.string(),
  type: z.string(),
});

export const segmentSchema = z.object({
  id: z.string(),
  videoId: z.string(),
  videoName: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  color: z.string(),
});

export type VideoFile = z.infer<typeof videoFileSchema>;
export type Segment = z.infer<typeof segmentSchema>;

export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  quality: number;
}

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
