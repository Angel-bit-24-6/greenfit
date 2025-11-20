import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from 'react-native';
import { useThemeStore } from '../stores/themeStore';
import { useMemo } from 'react';

interface AppHeaderProps {
  showLogo?: boolean;
  title?: string;
  rightAction?: {
    icon: string;
    onPress: () => void;
  };
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  showLogo = true, 
  title,
  rightAction 
}) => {
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();
  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  return (
    <View style={[styles.header, { backgroundColor: COLORS.background, borderBottomColor: COLORS.border }]}>
      <View style={styles.headerContent}>
        {showLogo && (
          <View style={styles.logoContainer}>
            <Image 
              source={require('../public/logoapp.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            {title ? (
              <Text style={[styles.title, { color: COLORS.text }]}>{title}</Text>
            ) : (
              <Text style={[styles.brandName, { color: COLORS.text }]}>NUTRIFRESCO</Text>
            )}
          </View>
        )}
        {!showLogo && title && (
          <Text style={[styles.title, { color: COLORS.text }]}>{title}</Text>
        )}
        {rightAction && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            style={[styles.rightButton, { borderColor: COLORS.border }]}
            activeOpacity={0.7}
          >
            <Text style={styles.rightIcon}>{rightAction.icon}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 40,
    height: 40,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  rightButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  rightIcon: {
    fontSize: 20,
  },
});

