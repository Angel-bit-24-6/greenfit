import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AdminStackParamList } from '../../navigation/AdminNavigator';
import { useAdminStore } from '../../stores/adminStore';
import { Button } from '../../components/ui/Button';

type PlateDetailScreenNavigationProp = StackNavigationProp<AdminStackParamList, 'PlateDetail'>;
type PlateDetailScreenRouteProp = RouteProp<AdminStackParamList, 'PlateDetail'>;

interface Props {
  navigation: PlateDetailScreenNavigationProp;
  route: PlateDetailScreenRouteProp;
}

const PlateDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { plateId, mode } = route.params;
  const { plates, ingredients, createPlate, updatePlate, isLoading } = useAdminStore();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    available: true,
    preparationTime: '',
    tags: '',
    selectedIngredients: [] as Array<{ ingredientId: string; quantity: string; required: boolean }>,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode !== 'create' && plateId) {
      const plate = plates.find(p => p.id === plateId);
      if (plate) {
        setFormData({
          name: plate.name,
          description: plate.description,
          price: plate.price.toString(),
          available: plate.available,
          preparationTime: plate.preparationTime?.toString() || '',
          tags: plate.tags.join(', '),
          selectedIngredients: plate.ingredients.map(pi => ({
            ingredientId: pi.ingredientId,
            quantity: pi.quantity.toString(),
            required: pi.required,
          })),
        });
      }
    }
  }, [plateId, mode, plates]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.price.trim() || isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Valid price is required';
    }

    if (formData.selectedIngredients.length === 0) {
      newErrors.ingredients = 'At least one ingredient is required';
    }

    // Validate ingredient quantities
    for (let i = 0; i < formData.selectedIngredients.length; i++) {
      const ing = formData.selectedIngredients[i];
      if (!ing.quantity.trim() || isNaN(Number(ing.quantity)) || Number(ing.quantity) <= 0) {
        newErrors[`ingredient_${i}`] = 'Valid quantity is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    const plateData = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      available: formData.available,
      preparationTime: formData.preparationTime ? parseInt(formData.preparationTime, 10) : undefined,
      tags: formData.tags.split(',').map(s => s.trim()).filter(s => s.length > 0),
      ingredients: formData.selectedIngredients.map(ing => ({
        ingredientId: ing.ingredientId,
        quantity: parseInt(ing.quantity, 10),
        required: ing.required,
      })),
    };

    let success = false;

    if (mode === 'create') {
      success = await createPlate(plateData);
    } else if (plateId) {
      success = await updatePlate(plateId, plateData);
    }

    if (success) {
      navigation.goBack();
    }
  };

  const addIngredient = () => {
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please add some ingredients first in the Inventory section.');
      return;
    }

    setFormData({
      ...formData,
      selectedIngredients: [
        ...formData.selectedIngredients,
        { ingredientId: ingredients[0].id, quantity: '1', required: true }
      ]
    });
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      selectedIngredients: formData.selectedIngredients.filter((_, i) => i !== index)
    });
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...formData.selectedIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, selectedIngredients: updated });
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
            placeholder="Enter plate name"
            error={errors.name}
          />

          <InputField
            label="Description *"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            placeholder="Describe the plate"
            multiline={true}
            error={errors.description}
          />
        </View>

        {/* Pricing & Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Pricing & Settings</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <InputField
                label="Price *"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
                error={errors.price}
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <InputField
                label="Prep Time (min)"
                value={formData.preparationTime}
                onChangeText={(text) => setFormData({ ...formData, preparationTime: text })}
                placeholder="15"
                keyboardType="numeric"
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

          <InputField
            label="Tags"
            value={formData.tags}
            onChangeText={(text) => setFormData({ ...formData, tags: text })}
            placeholder="vegan, spicy, protein-rich (comma separated)"
          />
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🥬 Ingredients</Text>
            <Button
              title="➕ Add"
              onPress={addIngredient}
              style={styles.addButton}
            />
          </View>

          {errors.ingredients && (
            <Text style={styles.errorText}>{errors.ingredients}</Text>
          )}

          {formData.selectedIngredients.map((selectedIng, index) => {
            const ingredient = ingredients.find(i => i.id === selectedIng.ingredientId);
            
            return (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.ingredientHeader}>
                  <Text style={styles.ingredientLabel}>Ingredient {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeIngredient(index)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>🗑️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.ingredientRow}>
                  <View style={styles.ingredientSelect}>
                    <Text style={styles.inputLabel}>Select Ingredient</Text>
                    {/* Simple dropdown simulation - in real app use proper picker */}
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.selectedIngredientName}>
                        {ingredient?.name || 'Select ingredient'}
                      </Text>
                      <Text style={styles.selectedIngredientStock}>
                        Stock: {ingredient?.stock || 0}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.quantityInput}>
                    <InputField
                      label="Quantity"
                      value={selectedIng.quantity}
                      onChangeText={(text) => updateIngredient(index, 'quantity', text)}
                      placeholder="1"
                      keyboardType="numeric"
                      error={errors[`ingredient_${index}`]}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.requiredToggle}
                  onPress={() => updateIngredient(index, 'required', !selectedIng.required)}
                >
                  <Text style={styles.requiredLabel}>Required ingredient</Text>
                  <View style={[
                    styles.toggle,
                    selectedIng.required ? styles.toggleActive : styles.toggleInactive
                  ]}>
                    <View style={[
                      styles.toggleThumb,
                      selectedIng.required ? styles.toggleThumbActive : styles.toggleThumbInactive
                    ]} />
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Cancel"
            onPress={() => navigation.goBack()}
            style={[styles.actionButton, styles.cancelButton]}
          />
          
          <Button
            title={mode === 'create' ? 'Create Plate' : 'Update Plate'}
            onPress={handleSave}
            style={[styles.actionButton, styles.saveButton]}
            disabled={isLoading}
          />
        </View>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
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
  ingredientItem: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  ingredientLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  removeButton: {
    padding: 4,
  },
  removeButtonText: {
    fontSize: 16,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ingredientSelect: {
    flex: 2,
    marginRight: 12,
  },
  ingredientInfo: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedIngredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  selectedIngredientStock: {
    fontSize: 12,
    color: '#6B7280',
  },
  quantityInput: {
    flex: 1,
  },
  requiredToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  requiredLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
});

export default PlateDetailScreen;