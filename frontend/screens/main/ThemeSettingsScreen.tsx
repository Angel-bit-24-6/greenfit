import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useThemeStore, PREDEFINED_THEMES, Theme, ThemeColors, ColorMode } from '../../stores/themeStore';
import { Switch } from 'react-native';

export const ThemeSettingsScreen: React.FC = () => {
  const { currentTheme, colorMode, setTheme, setColorMode, initializeTheme, getThemeColors } = useThemeStore();
  const [loading, setLoading] = useState(true);
  const COLORS = getThemeColors();
  
  // Create dynamic styles based on current theme
  const styles = useMemo(() => createStyles(COLORS), [currentTheme.id, colorMode]);

  useEffect(() => {
    initializeTheme().then(() => setLoading(false));
  }, []);

  const handleThemeSelect = async (theme: Theme) => {
    await setTheme(theme.id);
  };

  const handleColorModeToggle = async (value: boolean) => {
    await setColorMode(value ? 'light' : 'dark');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.loadingText, { color: COLORS.text }]}>Cargando temas...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: COLORS.text }]}>🎨 Temas</Text>
        <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>
          Personaliza la apariencia de la aplicación
        </Text>
      </View>

      {/* Color Mode Toggle */}
      <View style={[styles.colorModeSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <View style={styles.colorModeContent}>
          <View style={styles.colorModeInfo}>
            <Text style={[styles.colorModeTitle, { color: COLORS.text }]}>
              {colorMode === 'dark' ? '🌙' : '☀️'} Modo {colorMode === 'dark' ? 'Oscuro' : 'Claro'}
            </Text>
            <Text style={[styles.colorModeSubtitle, { color: COLORS.textSecondary }]}>
              {colorMode === 'dark' 
                ? 'Fondo oscuro para reducir la fatiga visual' 
                : 'Fondo claro para una experiencia más brillante'}
            </Text>
          </View>
          <Switch
            value={colorMode === 'light'}
            onValueChange={handleColorModeToggle}
            trackColor={{ false: COLORS.surfaceElevated, true: COLORS.primary }}
            thumbColor={COLORS.background}
            ios_backgroundColor={COLORS.surfaceElevated}
          />
        </View>
      </View>

      <View style={styles.themesGrid}>
        {PREDEFINED_THEMES.map((theme) => {
          const isSelected = currentTheme.id === theme.id;
          const themeColors = theme.colors[colorMode];
          
          return (
            <TouchableOpacity
              key={theme.id}
              onPress={() => handleThemeSelect(theme)}
              style={[
                styles.themeCard,
                {
                  backgroundColor: COLORS.surface,
                  borderColor: isSelected ? themeColors.primary : COLORS.border,
                  borderWidth: isSelected ? 2 : 1,
                },
                isSelected && {
                  backgroundColor: themeColors.surfaceCard,
                },
              ]}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.themePreview,
                  {
                    backgroundColor: themeColors.primary,
                    borderColor: isSelected ? themeColors.primary : 'transparent',
                    borderWidth: isSelected ? 3 : 0,
                  },
                ]}
              >
                <Text style={styles.themeEmoji}>{theme.emoji}</Text>
              </View>
              
              <View style={styles.themeInfo}>
                <Text
                  style={[
                    styles.themeName,
                    {
                      color: isSelected ? themeColors.primary : COLORS.text,
                    },
                  ]}
                >
                  {theme.name}
                </Text>
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: themeColors.primary }]}>
                    <Text style={styles.selectedText}>✓ Seleccionado</Text>
                  </View>
                )}
              </View>

              {/* Color preview */}
              <View style={styles.colorPreview}>
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: themeColors.primary },
                  ]}
                />
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: themeColors.primaryDark },
                  ]}
                />
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: themeColors.primaryLight },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.infoSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.infoTitle, { color: COLORS.text }]}>💡 Información</Text>
        <Text style={[styles.infoText, { color: COLORS.textSecondary }]}>
          Los temas se aplicarán automáticamente en toda la aplicación. Tu
          selección se guardará para futuras sesiones.
        </Text>
      </View>
    </ScrollView>
  );
};

const createStyles = (COLORS: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  loadingText: {
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  colorModeSection: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
  },
  colorModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorModeInfo: {
    flex: 1,
    marginRight: 16,
  },
  colorModeTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  colorModeSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  themesGrid: {
    gap: 20,
    marginBottom: 32,
  },
  themeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  themePreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  themeEmoji: {
    fontSize: 40,
  },
  themeInfo: {
    marginBottom: 16,
  },
  themeName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  selectedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  selectedText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  colorPreview: {
    flexDirection: 'row',
    gap: 12,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  infoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    fontWeight: '400',
  },
});

