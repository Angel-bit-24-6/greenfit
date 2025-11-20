import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BaseToast, ErrorToast, InfoToast } from 'react-native-toast-message';
import { useThemeStore } from '../stores/themeStore';

// Custom toast components with modern design
const CustomSuccessToast = (props: any) => {
  const { getThemeColors, colorMode } = useThemeStore();
  const colors = getThemeColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.primary }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
        <Text style={styles.iconText}>✓</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  );
};

const CustomErrorToast = (props: any) => {
  const { getThemeColors, colorMode } = useThemeStore();
  const colors = getThemeColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.error }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.error }]}>
        <Text style={styles.iconText}>✕</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  );
};

const CustomInfoToast = (props: any) => {
  const { getThemeColors, colorMode } = useThemeStore();
  const colors = getThemeColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.primary }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
        <Text style={styles.iconText}>ℹ</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  );
};

const CustomWarningToast = (props: any) => {
  const { getThemeColors, colorMode } = useThemeStore();
  const colors = getThemeColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: '#f59e0b' }]}>
      <View style={[styles.iconContainer, { backgroundColor: '#f59e0b' }]}>
        <Text style={styles.iconText}>⚠</Text>
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {props.text1}
        </Text>
        {props.text2 && (
          <Text style={[styles.message, { color: colors.textSecondary }]} numberOfLines={3}>
            {props.text2}
          </Text>
        )}
      </View>
    </View>
  );
};

export const toastConfig = {
  success: (props: any) => <CustomSuccessToast {...props} />,
  error: (props: any) => <CustomErrorToast {...props} />,
  info: (props: any) => <CustomInfoToast {...props} />,
  warning: (props: any) => <CustomWarningToast {...props} />,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    minHeight: 70,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
});
