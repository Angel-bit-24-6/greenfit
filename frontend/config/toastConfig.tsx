import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';

export const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.baseToast, styles.successToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      leadingIcon={() => (
        <View style={[styles.iconContainer, styles.successIcon]}>
          <Text style={styles.iconText}>✓</Text>
        </View>
      )}
    />
  ),
  
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[styles.baseToast, styles.errorToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      leadingIcon={() => (
        <View style={[styles.iconContainer, styles.errorIcon]}>
          <Text style={styles.iconText}>⚠</Text>
        </View>
      )}
    />
  ),
  
  info: (props: any) => (
    <InfoToast
      {...props}
      style={[styles.baseToast, styles.infoToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      leadingIcon={() => (
        <View style={[styles.iconContainer, styles.infoIcon]}>
          <Text style={styles.iconText}>ℹ</Text>
        </View>
      )}
    />
  ),
  
  warning: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.baseToast, styles.warningToast]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      text1NumberOfLines={2}
      text2NumberOfLines={3}
      leadingIcon={() => (
        <View style={[styles.iconContainer, styles.warningIcon]}>
          <Text style={styles.iconText}>⚡</Text>
        </View>
      )}
    />
  ),
};

const styles = StyleSheet.create({
  baseToast: {
    borderRadius: 12,
    marginHorizontal: 16,
    paddingHorizontal: 16,
    height: 'auto',
    minHeight: 80,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  
  contentContainer: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    flex: 1,
  },
  
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    alignSelf: 'center',
  },
  
  iconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  
  text1: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  
  text2: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  
  // Toast variants
  successToast: {
    borderLeftColor: '#22c55e',
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
  },
  
  errorToast: {
    borderLeftColor: '#ef4444',
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
  },
  
  infoToast: {
    borderLeftColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    borderLeftWidth: 4,
  },
  
  warningToast: {
    borderLeftColor: '#f59e0b',
    backgroundColor: '#fffbeb',
    borderLeftWidth: 4,
  },
  
  // Icon variants
  successIcon: {
    backgroundColor: '#22c55e',
  },
  
  errorIcon: {
    backgroundColor: '#ef4444',
  },
  
  infoIcon: {
    backgroundColor: '#3b82f6',
  },
  
  warningIcon: {
    backgroundColor: '#f59e0b',
  },
});