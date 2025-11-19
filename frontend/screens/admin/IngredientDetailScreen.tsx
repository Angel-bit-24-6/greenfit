import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useAdminStore } from '../../stores/adminStore';
import { Button } from '../../components/ui/Button';

type IngredientDetailScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'IngredientDetail'>;
type IngredientDetailScreenRouteProp = RouteProp<AdminStackParamList, 'IngredientDetail'>;

interface Props {
  navigation: IngredientDetailScreenNavigationProp;
  route: IngredientDetailScreenRouteProp;
}

const IngredientDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { ingredientId, mode } = route.params;
  const { ingredients, createIngredient, updateIngredient, isLoading } = useAdminStore();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stock: '',
    price: '',
    available: true,
    synonyms: '',
    tags: '',
    allergens: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode !== 'create' && ingredientId) {
      const ingredient = ingredients.find(i => i.id === ingredientId);
      if (ingredient) {
        setFormData({
          name: ingredient.name,
          description: ingredient.description || '',
          stock: ingredient.stock.toString(),
          price: ingredient.price.toString(),
          available: ingredient.available,
          synonyms: ingredient.synonyms.join(', '),
          tags: ingredient.tags.join(', '),
          allergens: ingredient.allergens.join(', '),
        });
      }
    }
  }, [ingredientId, mode, ingredients]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.stock.trim() || isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
      newErrors.stock = 'Valid stock number is required';
    }

    if (!formData.price.trim() || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const ingredientData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      stock: parseInt(formData.stock, 10),
      price: parseFloat(formData.price),
      available: formData.available,
      synonyms: formData.synonyms.split(',').map(s => s.trim()).filter(s => s.length > 0),
      tags: formData.tags.split(',').map(s => s.trim()).filter(s => s.length > 0),
      allergens: formData.allergens.split(',').map(s => s.trim()).filter(s => s.length > 0),
    };

    let success = false;

    if (mode === 'create') {
      success = await createIngredient(ingredientData);
    } else if (ingredientId) {
      success = await updateIngredient(ingredientId, ingredientData);
    }

    if (success) {
      navigation.goBack();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Ingredient',
      'Are you sure you want to delete this ingredient?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete functionality
            navigation.goBack();
          },
        },
      ]
    );
  };

  const InputField = ({ 
    label, 
    value, 
    onChangeText, 
    placeholder, 
    error,
    multiline = false,
    keyboardType = 'default',
    ...props 
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    error?: string;
    multiline?: boolean;
    keyboardType?: any;
    [key: string]: any;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          error && styles.inputError
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        keyboardType={keyboardType}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Basic Information</Text>
          
          <InputField
            label="Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter ingredient name"
            error={errors.name}
          />

          <InputField
            label="Description"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Optional description"
            multiline={true}
          />
        </View>

        {/* Stock & Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Stock & Pricing</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <InputField
                label="Stock *"
                value={formData.stock}
                onChangeText={(text) => setFormData({ ...formData, stock: text })}
                placeholder="0"
                keyboardType="numeric"
                error={errors.stock}
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <InputField
                label="Price *"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                error={errors.price}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.availabilityToggle}
            onPress={() => setFormData({ ...formData, available: !formData.available })}
          >
            <Text style={styles.availabilityLabel}>Availability</Text>
            <View style={[
              styles.toggle,
              formData.available ? styles.toggleActive : styles.toggleInactive
            ]}>
              <View style={[
                styles.toggleThumb,
                formData.available ? styles.toggleThumbActive : styles.toggleThumbInactive
              ]} />
            </View>
            <Text style={[
              styles.availabilityStatus,
              { color: formData.available ? '#10B981' : '#EF4444' }
            ]}>
              {formData.available ? 'Available' : 'Unavailable'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Categories & Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏷️ Categories & Tags</Text>
          
          <InputField
            label="Synonyms"
            value={formData.synonyms}
            onChangeText={(text) => setFormData({ ...formData, synonyms: text })}
            placeholder="Alternative names (comma separated)"
          />

          <InputField
            label="Tags"
            value={formData.tags}
            onChangeText={(text) => setFormData({ ...formData, tags: text })}
            placeholder="vegan, gluten-free, organic (comma separated)"
          />

          <InputField
            label="Allergens"
            value={formData.allergens}
            onChangeText={(text) => setFormData({ ...formData, allergens: text })}
            placeholder="nuts, soy, gluten (comma separated)"
          />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            style={[styles.actionButton, styles.cancelButton]}
          />
          
          <Button
            title={mode === 'create' ? 'Create' : 'Update'}
            onPress={handleSave}
            style={[styles.actionButton, styles.saveButton]}
            disabled={isLoading}
          />
        </View>

        {mode !== 'create' && (
          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>⚠️ Danger Zone</Text>
            <Button
              title="🗑️ Delete Ingredient"
              onPress={handleDelete}
              style={styles.deleteButton}
            />
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  form: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  availabilityToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  availabilityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 12,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    marginRight: 8,
  },
  toggleActive: {
    backgroundColor: '#10B981',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  toggleInactive: {
    backgroundColor: '#D1D5DB',
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {},
  toggleThumbInactive: {},
  availabilityStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#10B981',
  },
  dangerZone: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
});

export default IngredientDetailScreen;