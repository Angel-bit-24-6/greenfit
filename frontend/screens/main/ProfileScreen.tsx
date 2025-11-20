import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import type { RootStackParamList } from '../../navigation/AppNavigator';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user, logout } = useAuthStore();
  const { currentTheme, colorMode, getThemeColors } = useThemeStore();
  const COLORS = getThemeColors();

  const handleLogout = () => {
    logout();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: COLORS.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: COLORS.primary }]}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.userName, { color: COLORS.text }]}>
          {user?.name || 'Usuario'}
        </Text>
        <Text style={[styles.userEmail, { color: COLORS.textSecondary }]}>
          {user?.email}
        </Text>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
          Configuración
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate('ThemeSettings')}
          style={[styles.settingItem, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingEmoji}>🎨</Text>
            <View style={styles.settingText}>
              <Text style={[styles.settingTitle, { color: COLORS.text }]}>
                Temas
              </Text>
              <Text style={[styles.settingSubtitle, { color: COLORS.textSecondary }]}>
                {currentTheme.name}
              </Text>
            </View>
          </View>
          <View style={[styles.themePreview, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.themeEmoji}>{currentTheme.emoji}</Text>
          </View>
          <Text style={[styles.arrow, { color: COLORS.textSecondary }]}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: COLORS.text }]}>
          Cuenta
        </Text>

        <View style={[styles.infoCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>
              Nombre
            </Text>
            <Text style={[styles.infoValue, { color: COLORS.text }]}>
              {user?.name}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>
              Email
            </Text>
            <Text style={[styles.infoValue, { color: COLORS.text }]}>
              {user?.email}
            </Text>
          </View>
          {user?.phone && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: COLORS.textSecondary }]}>
                Teléfono
              </Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]}>
                {user.phone}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        onPress={handleLogout}
        style={[styles.logoutButton, { backgroundColor: COLORS.surface, borderColor: COLORS.error }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.logoutText, { color: COLORS.error }]}>
          Cerrar Sesión
        </Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
          🌱 GreenFit v1.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 42,
    fontWeight: '800',
    color: '#000000',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '400',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingEmoji: {
    fontSize: 28,
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  themePreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  themeEmoji: {
    fontSize: 20,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '300',
  },
  infoCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  logoutText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '400',
  },
});

