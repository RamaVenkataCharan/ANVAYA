import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Colors } from '../constants/colors';
import {
  ViewableReport,
  downloadReportFile,
  shareOrOpenDocument,
} from '../services/reportViewer';

interface ReportViewModalProps {
  visible: boolean;
  report: ViewableReport | null;
  onClose: () => void;
}

export function ReportViewModal({ visible, report, onClose }: ReportViewModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [mimeType, setMimeType] = useState('application/pdf');

  useEffect(() => {
    if (visible && report) {
      handleDownload(report);
    } else {
      resetState();
    }
  }, [visible, report]);

  const resetState = () => {
    setLoading(false);
    setErrorMessage(null);
    setDownloadedUri(null);
    setIsImage(false);
    setMimeType('application/pdf');
  };

  const handleDownload = async (targetReport: ViewableReport) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await downloadReportFile(targetReport);

      setDownloadedUri(res.localUri);
      setIsImage(res.isImage);
      setMimeType(res.mimetype);
      setLoading(false);

      if (!res.isImage) {
        // Document: open native share/view sheet
        await shareOrOpenDocument(res.localUri, targetReport.title, res.mimetype);
      }
    } catch (err: unknown) {
      setLoading(false);
      const errorObj = err as Error;
      setErrorMessage(errorObj.message || 'Unable to download report. Please try again.');
    }
  };

  const handleShareAgain = async () => {
    if (downloadedUri && report) {
      try {
        await shareOrOpenDocument(downloadedUri, report.title, mimeType);
      } catch (err: unknown) {
        const errorObj = err as Error;
        setErrorMessage(errorObj.message || 'Unable to open document viewer.');
      }
    }
  };

  if (!visible || !report) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {report.title || 'Clinical Document'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {report.type ? report.type.replace(/_/g, ' ') : 'Health Report'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕ Close</Text>
          </TouchableOpacity>
        </View>

        {/* Content Body */}
        <View style={styles.content}>
          {loading && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingTitle}>Downloading Document...</Text>
              <Text style={styles.loadingSubtitle}>
                Authenticating with clinical server & decrypting vault stream
              </Text>
            </View>
          )}

          {!loading && errorMessage && (
            <View style={styles.centerBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Download Failed</Text>
              <Text style={styles.errorDesc}>{errorMessage}</Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.retryBtn]}
                  onPress={() => handleDownload(report)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryBtnText}>🔄 Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.dismissBtn]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dismissBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!loading && !errorMessage && downloadedUri && isImage && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: downloadedUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <View style={styles.imageFooter}>
                <TouchableOpacity
                  style={styles.shareBtn}
                  onPress={handleShareAgain}
                  activeOpacity={0.8}
                >
                  <Text style={styles.shareBtnText}>📤 Share / Export Image</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {!loading && !errorMessage && downloadedUri && !isImage && (
            <View style={styles.centerBox}>
              <Text style={styles.pdfIcon}>📄</Text>
              <Text style={styles.docReadyTitle}>Document Ready</Text>
              <Text style={styles.docReadySubtitle}>
                The report was downloaded securely to your device cache.
              </Text>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.reopenBtn]}
                  onPress={handleShareAgain}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reopenBtnText}>📂 Open in Viewer / Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.dismissBtn]}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dismissBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Dark slate medical viewer background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  centerBox: {
    alignItems: 'center',
    maxWidth: 340,
  },
  loadingTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  errorTitle: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorDesc: {
    color: '#CBD5E1',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  pdfIcon: {
    fontSize: 54,
    marginBottom: 12,
  },
  docReadyTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  docReadySubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryBtn: {
    backgroundColor: '#2563EB',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  reopenBtn: {
    backgroundColor: '#059669',
  },
  reopenBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  dismissBtn: {
    backgroundColor: '#334155',
  },
  dismissBtnText: {
    color: '#E2E8F0',
    fontWeight: '600',
    fontSize: 15,
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: width - 32,
    height: height * 0.7,
  },
  imageFooter: {
    marginTop: 16,
    width: '100%',
    paddingHorizontal: 16,
  },
  shareBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
