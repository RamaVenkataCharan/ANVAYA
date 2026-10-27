import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // In production, error can be sent to EAS Observe or monitoring service
    if (__DEV__) {
      console.error('[ErrorBoundary caught error]:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.iconContainer}>
              <Text style={styles.errorIcon}>🛡️</Text>
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected display error occurred in this view. Your medical
              records and authenticated session remain safe.
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleReset}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Try recovering screen"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && (
              <View style={styles.debugSection}>
                <TouchableOpacity
                  style={styles.debugToggle}
                  onPress={() =>
                    this.setState((prev) => ({ showDetails: !prev.showDetails }))
                  }
                  accessibilityRole="button"
                >
                  <Text style={styles.debugToggleText}>
                    {this.state.showDetails ? 'Hide Diagnostics ▲' : 'View Diagnostics ▼'}
                  </Text>
                </TouchableOpacity>

                {this.state.showDetails && (
                  <View style={styles.detailsBox}>
                    <Text style={styles.errorText}>
                      {this.state.error?.toString()}
                    </Text>
                    {this.state.errorInfo?.componentStack && (
                      <Text style={styles.stackText}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 28,
  },
  actionRow: {
    width: '100%',
    maxWidth: 280,
    gap: 12,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  debugSection: {
    marginTop: 32,
    width: '100%',
  },
  debugToggle: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  debugToggleText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  detailsBox: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 8,
    maxHeight: 200,
  },
  errorText: {
    color: Colors.status.error,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  stackText: {
    color: Colors.text.muted,
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
