import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<'success' | 'error' | 'info'>('info');
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showToast = (msg: string, t: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setType(t);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setMessage(null));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <Animated.View
            style={[
                styles.toastContainer,
                { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }
            ]}
        >
          <View style={[styles.toast, type === 'error' ? styles.error : type === 'success' ? styles.success : styles.info]}>
            <FontAwesome
                name={type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}
                size={20}
                color="white"
            />
            <Text style={styles.text}>{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 50,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    color: 'white',
    marginLeft: 10,
    fontWeight: '600',
  },
  success: {
    backgroundColor: '#28a745',
  },
  error: {
    backgroundColor: '#dc3545',
  },
  info: {
    backgroundColor: '#001f3f', // Navy
    borderWidth: 1,
    borderColor: '#d4af37', // Gold
  },
});
