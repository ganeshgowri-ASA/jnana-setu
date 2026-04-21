import { z } from "zod";

export const LicenseSchema = z.enum([
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "CC-BY-NC-4.0",
  "CC-BY-NC-SA-4.0",
  "CC0-1.0",
  "Public-Domain",
  "GoI-Open-Data",
  "Official-Free-Access",
]);

export const MediaSchema = z.enum([
  "video-lectures",
  "textbook",
  "lecture-notes",
  "problem-set",
  "past-paper",
  "solution-manual",
  "interactive",
  "reference",
]);

export const LevelSchema = z.enum(["ug", "pg", "gate", "mixed"]);

export const SourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  homepage: z.string().url(),
  publisher: z.string(),
  defaultLicense: LicenseSchema,
  notes: z.string().optional(),
});

export const ResourceSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  description: z.string().min(10),
  sourceId: z.string(),
  url: z.string().url(),
  subjects: z.array(z.string()).min(1),
  media: z.array(MediaSchema).min(1),
  level: LevelSchema,
  authors: z.array(z.string()).default([]),
  institution: z.string().optional(),
  year: z.number().int().min(1950).max(2100).optional(),
  license: LicenseSchema,
  licenseUrl: z.string().url().optional(),
  gateTopics: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  verifiedAt: z.string().date().optional(),
});

export const SubjectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  shortName: z.string().optional(),
  description: z.string(),
  gateWeightPercent: z.number().min(0).max(100).optional(),
});

export type License = z.infer<typeof LicenseSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type Level = z.infer<typeof LevelSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type Subject = z.infer<typeof SubjectSchema>;
