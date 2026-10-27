import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '../constants/colors';
import medicineData from '../constants/medicines.json';

interface MedicineAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelect?: (medicine: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  maxSuggestions?: number;
  accessibilityLabel?: string;
}

export function MedicineAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = 'e.g. Paracetamol or Amoxicillin',
  label = 'Medicine Name *',
  style,
  inputStyle,
  maxSuggestions = 5,
  accessibilityLabel = 'Medicine name entry',
}: MedicineAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const suggestions = useMemo(() => {
    if (!isFocused || dismissed) return [];
    const query = value.trim().toLowerCase();
    if (query.length < 2) return [];

    return medicineData.medicines
      .filter((med) => med.toLowerCase().includes(query))
      .slice(0, maxSuggestions);
  }, [value, isFocused, dismissed, maxSuggestions]);

  const handleSelect = (medicine: string) => {
    onChangeText(medicine);
    if (onSelect) {
      onSelect(medicine);
    }
    setDismissed(true);
  };

  const handleChange = (text: string) => {
    setDismissed(false);
    onChangeText(text);
  };

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.convenienceBadge}>Quick Suggestions</Text>
        </View>
      ) : null}

      <TextInput
        style={[styles.input, isFocused && styles.inputFocused, inputStyle]}
        placeholder={placeholder}
        placeholderTextColor={Colors.text.muted}
        value={value}
        onChangeText={handleChange}
        onFocus={() => {
          setIsFocused(true);
          setDismissed(false);
        }}
        onBlur={() => {
          // Slight timeout to allow touch on suggestion to fire before blur hides it
          setTimeout(() => setIsFocused(false), 200);
        }}
        autoCapitalize="words"
        autoCorrect={false}
        accessibilityRole="combobox"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Type to search common medicine suggestions or type any custom medicine name freely"
      />

      {/* Convenience note */}
      <Text style={styles.disclaimerText}>
        💡 Convenience list only — free-text custom entry is always supported.
      </Text>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && isFocused && !dismissed && (
        <View style={styles.dropdownContainer}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownHeaderText}>Common Suggestions (Tap to pick)</Text>
            <TouchableOpacity
              onPress={() => setDismissed(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          </View>

          {suggestions.map((med, index) => (
            <TouchableOpacity
              key={`${med}-${index}`}
              style={[
                styles.suggestionItem,
                index === suggestions.length - 1 && styles.suggestionItemLast,
              ]}
              onPress={() => handleSelect(med)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Select suggestion ${med}`}
            >
              <Text style={styles.suggestionText}>💊 {med}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  convenienceBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.accent,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text.primary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  inputFocused: {
    borderColor: Colors.primaryLight,
  },
  disclaimerText: {
    fontSize: 11,
    color: Colors.text.muted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  dropdownContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 100,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dismissText: {
    fontSize: 13,
    color: Colors.text.muted,
    paddingHorizontal: 4,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },
});
