import { z } from 'zod';
import { ReportType } from '../enums';

export const createReportSchema = z.object({
  title: z.string().trim().min(2, 'Report title is required').max(150),
  type: z.nativeEnum(ReportType).default(ReportType.OTHER),
  fileUrl: z.string().trim().min(1, 'File URL or data URI is required'),
  notes: z.string().trim().max(1000).optional(),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
