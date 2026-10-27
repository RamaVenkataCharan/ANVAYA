import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from './api';
import { useAuthStore } from '../store/auth';

export interface ViewableReport {
  id: string;
  title: string;
  type?: string;
  fileUrl?: string;
  notes?: string | null;
  uploadedAt?: string;
}

export interface ReportDownloadResult {
  localUri: string;
  isImage: boolean;
  mimetype: string;
}

/**
 * Derives a safe filename and extension for the cached report document
 */
export function getReportLocalCacheUri(report: ViewableReport): string {
  const sanitizedTitle = (report.title || 'report')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 50);

  const rawUrl = (report.fileUrl || '').toLowerCase();
  let ext = '.pdf';
  if (rawUrl.endsWith('.png')) ext = '.png';
  else if (rawUrl.endsWith('.jpg') || rawUrl.endsWith('.jpeg')) ext = '.jpg';
  else if (rawUrl.endsWith('.webp')) ext = '.webp';
  else if (report.type === 'IMAGING') ext = '.jpg';

  const filename = `${report.id}_${sanitizedTitle}${sanitizedTitle.endsWith(ext) ? '' : ext}`;
  return `${FileSystem.cacheDirectory}${filename}`;
}

/**
 * Downloads a protected clinical document with Bearer auth headers into local cache
 */
export async function downloadReportFile(
  report: ViewableReport,
  onProgress?: (progressFraction: number) => void
): Promise<ReportDownloadResult> {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    throw new Error('Authorization required. Please log in to view reports.');
  }

  const targetUri = getReportLocalCacheUri(report);
  const downloadUrl = `${API_BASE_URL}/reports/${report.id}/file`;

  // Use downloadAsync with Authorization Bearer header
  const downloadRes = await FileSystem.downloadAsync(downloadUrl, targetUri, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (downloadRes.status === 401) {
    throw new Error('Session expired or unauthorized. Please re-login.');
  }
  if (downloadRes.status === 403) {
    throw new Error(
      'Access restricted: You must be the record owner or have active patient consent.'
    );
  }
  if (downloadRes.status === 404) {
    throw new Error('Clinical document file not found on server.');
  }
  if (downloadRes.status >= 400) {
    throw new Error(`Failed to download report (HTTP ${downloadRes.status}).`);
  }

  const contentType = (
    downloadRes.headers['content-type'] ||
    downloadRes.headers['Content-Type'] ||
    ''
  ).toLowerCase();

  const isImage =
    contentType.startsWith('image/') ||
    /\.(jpe?g|png|webp|gif|bmp)$/i.test(targetUri);

  return {
    localUri: downloadRes.uri,
    isImage,
    mimetype: contentType || (isImage ? 'image/jpeg' : 'application/pdf'),
  };
}

/**
 * Opens or shares a downloaded report using expo-sharing
 */
export async function shareOrOpenDocument(
  localUri: string,
  title: string,
  mimetype: string
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Document viewing/sharing is not available on this device.');
  }

  await Sharing.shareAsync(localUri, {
    mimeType: mimetype || 'application/pdf',
    dialogTitle: title || 'Clinical Document',
    UTI: mimetype === 'application/pdf' ? 'com.adobe.pdf' : undefined,
  });
}
