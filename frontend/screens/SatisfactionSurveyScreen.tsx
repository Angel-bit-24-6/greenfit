import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { ToastManager } from '../utils/ToastManager';
import { Button } from '../components/ui/Button';

type SatisfactionSurveyRouteParams = {
  SatisfactionSurvey: {
    orderId: string;
  };
};

type SatisfactionSurveyRouteProp = RouteProp<SatisfactionSurveyRouteParams, 'SatisfactionSurvey'>;

type RatingValue = 1 | 2 | 3 | 4 | 5;
type ProductQuality = 'excellent' | 'good' | 'regular' | 'bad';
type DeliveryExperience = 'excellent' | 'good' | 'regular' | 'bad';

const RATING_LABELS: Record<RatingValue, string> = {
  1: 'Muy malo',
  2: 'Malo',
  3: 'Regular',
  4: 'Bueno',
  5: '¡Excelente!',
};

const PRODUCT_QUALITY_OPTIONS = [
  {
    value: 'excellent' as ProductQuality,
    label: 'Excelente - Productos muy frescos y de alta calidad',
  },
  {
    value: 'good' as ProductQuality,
    label: 'Buena - Productos frescos',
  },
  {
    value: 'regular' as ProductQuality,
    label: 'Regular - Algunos productos no estaban tan frescos',
  },
  {
    value: 'bad' as ProductQuality,
    label: 'Mala - Productos en mal estado',
  },
];

const DELIVERY_EXPERIENCE_OPTIONS = [
  {
    value: 'excellent' as DeliveryExperience,
    label: 'Excelente - Puntual y buen trato',
  },
  {
    value: 'good' as DeliveryExperience,
    label: 'Buena - Todo en orden',
  },
  {
    value: 'regular' as DeliveryExperience,
    label: 'Regular - Hubo algunos retrasos',
  },
  {
    value: 'bad' as DeliveryExperience,
    label: 'Mala - Problemas con la entrega',
  },
];

export const SatisfactionSurveyScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<SatisfactionSurveyRouteProp>();
  const { orderId } = route.params;
  const { user } = useAuthStore();
  const { getThemeColors, currentTheme, colorMode } = useThemeStore();
  const COLORS = getThemeColors();

  const [generalRating, setGeneralRating] = useState<RatingValue | null>(null);
  const [productQuality, setProductQuality] = useState<ProductQuality | null>(null);
  const [deliveryExperience, setDeliveryExperience] = useState<DeliveryExperience | null>(null);
  const [additionalComments, setAdditionalComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const styles = useMemo(() => createStyles(COLORS, colorMode), [currentTheme.id, colorMode]);

  const handleSubmit = async () => {
    // Validate required fields
    if (!generalRating) {
      ToastManager.error('Error', 'Por favor califica tu experiencia general');
      return;
    }
    if (!productQuality) {
      ToastManager.error('Error', 'Por favor califica la calidad de los productos');
      return;
    }
    if (!deliveryExperience) {
      ToastManager.error('Error', 'Por favor califica tu experiencia de entrega');
      return;
    }

    setSubmitting(true);
    try {
      // TODO: Send survey data to backend
      // For now, just simulate submission
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      ToastManager.success('Encuesta Enviada', '¡Gracias por tu feedback!');
      
      setTimeout(() => {
        (navigation as any).navigate('Main', { screen: 'HomeTab' });
      }, 2000);
    } catch (error) {
      console.error('Error submitting survey:', error);
      ToastManager.error('Error', 'No se pudo enviar la encuesta. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: RatingValue | null, onPress: (rating: RatingValue) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress(star as RatingValue)}
            activeOpacity={0.7}
          >
            <Text style={styles.star}>
              {currentRating && star <= currentRating ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
        {currentRating && (
          <Text style={[styles.ratingLabel, { color: COLORS.primary }]}>
            {RATING_LABELS[currentRating]}
          </Text>
        )}
      </View>
    );
  };

  const renderRadioOptions = (
    options: Array<{ value: string; label: string }>,
    selectedValue: string | null,
    onSelect: (value: string) => void
  ) => {
    return (
      <View style={styles.optionsContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.radioOption,
              {
                backgroundColor: selectedValue === option.value 
                  ? COLORS.primary + '20' 
                  : COLORS.background,
                borderColor: selectedValue === option.value 
                  ? COLORS.primary 
                  : COLORS.border,
              },
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
          >
            <View style={styles.radioCircle}>
              {selectedValue === option.value && (
                <View style={[styles.radioInner, { backgroundColor: COLORS.primary }]} />
              )}
            </View>
            <Text
              style={[
                styles.radioLabel,
                {
                  color: selectedValue === option.value ? COLORS.text : COLORS.textSecondary,
                  fontWeight: selectedValue === option.value ? '600' : '400',
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: COLORS.background }]} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: COLORS.border }]}>
        <Text style={[styles.title, { color: COLORS.text }]}>¿Cómo fue tu experiencia?</Text>
        <Text style={[styles.subtitle, { color: COLORS.textSecondary }]}>
          Ayúdanos a mejorar nuestro servicio compartiendo tu opinión
        </Text>
      </View>

      {/* General Rating */}
      <View style={[styles.section, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.label, { color: COLORS.text }]}>Calificación general *</Text>
        {renderStars(generalRating, setGeneralRating)}
      </View>

      {/* Product Quality */}
      <View style={[styles.section, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.question, { color: COLORS.text }]}>
          ¿Cómo calificarías la calidad de los productos? *
        </Text>
        {renderRadioOptions(
          PRODUCT_QUALITY_OPTIONS,
          productQuality,
          (value) => setProductQuality(value as ProductQuality)
        )}
      </View>

      {/* Delivery Experience */}
      <View style={[styles.section, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.question, { color: COLORS.text }]}>
          ¿Cómo fue tu experiencia de entrega? *
        </Text>
        {renderRadioOptions(
          DELIVERY_EXPERIENCE_OPTIONS,
          deliveryExperience,
          (value) => setDeliveryExperience(value as DeliveryExperience)
        )}
      </View>

      {/* Additional Comments */}
      <View style={[styles.section, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
        <Text style={[styles.label, { color: COLORS.text }]}>
          Comentarios adicionales (opcional)
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: COLORS.background,
              borderColor: COLORS.border,
              color: COLORS.text,
            },
          ]}
          value={additionalComments}
          onChangeText={setAdditionalComments}
          placeholder="Cuéntanos más sobre tu experiencia..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      {/* Submit Button */}
      <Button
        title={submitting ? 'Enviando...' : '👍 Enviar encuesta'}
        onPress={handleSubmit}
        disabled={submitting || !generalRating || !productQuality || !deliveryExperience}
        style={styles.submitButton}
        size="large"
      />

      {/* Footer */}
      <Text style={[styles.footerText, { color: COLORS.textSecondary }]}>
        Tus respuestas nos ayudan a mejorar nuestro servicio
      </Text>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const createStyles = (COLORS: any, colorMode: 'dark' | 'light') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  question: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    lineHeight: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  star: {
    fontSize: 28,
    marginRight: 4,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  optionsContainer: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radioLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  spacer: {
    height: 20,
  },
});

