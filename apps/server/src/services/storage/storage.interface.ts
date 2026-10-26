export interface StorageFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StoredFileResult {
  fileKey: string;
  fileUrl: string;
  filename: string;
  mimetype: string;
  size: number;
}

export interface StoredStreamResult {
  stream: NodeJS.ReadableStream;
  mimetype: string;
  filename: string;
  size: number;
}

export interface IStorageService {
  /**
   * Validates and persists a file to storage
   */
  save(file: StorageFile): Promise<StoredFileResult>;

  /**
   * Retrieves a readable stream for authenticated file streaming
   */
  getStream(fileKey: string): Promise<StoredStreamResult>;

  /**
   * Generates a signed URL if supported (optional)
   */
  getSignedUrl?(fileKey: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Removes a file from storage
   */
  delete(fileKey: string): Promise<void>;
}
