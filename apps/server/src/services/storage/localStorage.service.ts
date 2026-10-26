import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IStorageService, StorageFile, StoredFileResult, StoredStreamResult } from './storage.interface';
import { BadRequestError, NotFoundError } from '../../utils/errors';

export class LocalStorageService implements IStorageService {
  private uploadDir: string;
  private maxSizeBytes: number;
  private allowedMimeTypes: Set<string>;
  private allowedExtensions: Set<string>;

  constructor(uploadDir?: string, maxSizeBytes?: number) {
    this.uploadDir = uploadDir || path.join(process.cwd(), 'uploads', 'reports');
    // Default 10MB size limit
    this.maxSizeBytes = maxSizeBytes || 10 * 1024 * 1024;

    this.allowedMimeTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ]);

    this.allowedExtensions = new Set([
      '.pdf',
      '.jpg',
      '.jpeg',
      '.png',
    ]);

    // Ensure upload directory exists
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (err) {
      console.error('[LocalStorageService] Error creating upload directory:', err);
    }
  }

  /**
   * Validates and saves a file buffer to disk
   */
  async save(file: StorageFile): Promise<StoredFileResult> {
    if (!file || !file.buffer) {
      throw new BadRequestError('No file buffer provided for storage');
    }

    // 1. Enforce size limit
    if (file.size > this.maxSizeBytes || file.buffer.length > this.maxSizeBytes) {
      throw new BadRequestError(
        `File size exceeds maximum allowed limit of ${Math.round(this.maxSizeBytes / (1024 * 1024))}MB`
      );
    }

    // 2. Enforce file type (PDF, JPG, PNG)
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    if (!this.allowedMimeTypes.has(mime) || !this.allowedExtensions.has(ext)) {
      throw new BadRequestError(
        'Invalid file type. Only PDF, JPG, and PNG documents are allowed.'
      );
    }

    // 3. Generate secure randomized filename
    const safeFilename = `${crypto.randomUUID()}${ext}`;
    const destinationPath = path.join(this.uploadDir, safeFilename);

    await fs.promises.writeFile(destinationPath, file.buffer);

    return {
      fileKey: safeFilename,
      fileUrl: `/api/v1/reports/files/${safeFilename}`,
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Retrieves a readable stream for authenticated file streaming
   */
  async getStream(fileKey: string): Promise<StoredStreamResult> {
    // Sanitize fileKey to avoid directory traversal
    const safeKey = path.basename(fileKey);
    const filePath = path.join(this.uploadDir, safeKey);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundError('Requested clinical report file was not found');
    }

    const stat = await fs.promises.stat(filePath);
    const ext = path.extname(safeKey).toLowerCase();

    let mimetype = 'application/octet-stream';
    if (ext === '.pdf') mimetype = 'application/pdf';
    else if (ext === '.png') mimetype = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';

    const stream = fs.createReadStream(filePath);

    return {
      stream,
      mimetype,
      filename: safeKey,
      size: stat.size,
    };
  }

  /**
   * Deletes a file from disk
   */
  async delete(fileKey: string): Promise<void> {
    if (!fileKey) return;
    try {
      const safeKey = path.basename(fileKey);
      const filePath = path.join(this.uploadDir, safeKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err) {
      console.warn('[LocalStorageService] Error deleting file:', err);
    }
  }
}
