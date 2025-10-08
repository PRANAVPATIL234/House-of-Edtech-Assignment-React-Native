import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, StyleProp, ViewStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../constants/Colors'; // Import global styles

// Define props for the Custom Button
interface CustomButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'accent'; // Allows switching colors easily
  style?: StyleProp<ViewStyle>;
}

const CustomButton: React.FC<CustomButtonProps> = ({ 
    title, 
    onPress, 
    variant = 'primary', // Default to primary color
    style,
    ...rest 
}) => {
  
  // Determine the background color based on the variant prop
  const buttonBackgroundColor = variant === 'accent' ? Colors.accent : Colors.primary;

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: buttonBackgroundColor }, style]} 
      onPress={onPress}
      activeOpacity={0.7}
      {...rest}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Spacing.medium,
    paddingVertical: Spacing.small,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100, // Ensure buttons have a minimum width
  },
  buttonText: {
    color: Colors.card, // White text
    fontWeight: '600',
    fontSize: Typography.body,
  },
});

export default CustomButton;