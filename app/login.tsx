import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView, Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { getStudent, getToken, login } from '../src/services/authService';
import { COLORS } from '../src/utils/constants';

export default function LoginScreen() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');

  useEffect(() => {
    checkBiometric();
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    const token = await getToken();
    if (token) {
      router.replace('/checkin');
    }
  };

  const checkBiometric = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const biometricEnabled = await AsyncStorage.getItem('biometricEnabled');
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (compatible && enrolled && biometricEnabled === 'true') {
      setBiometricAvailable(true);
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      }
    }
  };

  const handleLogin = async () => {
    if (!studentId || !password) {
      Alert.alert('Error', 'Please enter your Student ID and password.');
      return;
    }
    setLoading(true);
    try {
      await login(studentId, password);
      router.replace('/checkin');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error?.response?.data?.message || 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    const token = await getToken();
    const savedStudent = await getStudent();

    if (!token || !savedStudent) {
      Alert.alert(
        'No Account Found',
        'Please sign in with your Student ID and password first, or create an account.',
      );
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Sign in as ${savedStudent.name}`,
      fallbackLabel: 'Use password instead',
      cancelLabel: 'Cancel',
    });

    if (result.success) {
      router.replace('/checkin');
    } else {
      Alert.alert('Failed', 'Biometric authentication failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Ionicons name="locate" size={28} color={COLORS.white} />
            </View>
            <Text style={styles.appName}>AttendTrack</Text>
            <Text style={styles.appSub}>GPS-based Attendance</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>Sign in to your account</Text>

            {/* Student ID */}
            <Text style={styles.label}>STUDENT ID</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="card-outline"
                size={18}
                color={COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="e.g. SCM211-0001/2022"
                placeholderTextColor={COLORS.muted}
                value={studentId}
                onChangeText={setStudentId}
                autoCapitalize="characters"
              />
            </View>

            {/* Password */}
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={COLORS.white} />
                : <Text style={styles.signInText}>Sign In</Text>
              }
            </TouchableOpacity>

            {/* Biometric Button — only shows if enabled during registration */}
            {biometricAvailable && (
              <>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometric}
                >
                  <Ionicons
                    name="finger-print-outline"
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.biometricText}>
                    Use {biometricType} / Face ID
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Forgot Password */}
            <Text style={styles.forgotText}>
              Forgot password? Contact your administrator
            </Text>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>new student?</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Create Account Button — prominent */}
            <TouchableOpacity
              style={styles.createAccountBtn}
              onPress={() => router.push('/register')}
            >
              <Ionicons
                name="person-add-outline"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.createAccountText}>
                Create Account
              </Text>
            </TouchableOpacity>

            <Text style={styles.createAccountSub}>
              Register using your student ID to get started
            </Text>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoBox: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  appName: { color: COLORS.white, fontSize: 20, fontWeight: '600' },
  appSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 },
  form: {
    flex: 1, backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    marginTop: -20, padding: 24,
  },
  formTitle: {
    fontSize: 16, fontWeight: '600',
    color: '#333', marginBottom: 20,
  },
  label: {
    fontSize: 10, color: COLORS.muted,
    letterSpacing: 0.5, marginBottom: 4,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#333' },
  signInBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 4, marginBottom: 20,
  },
  signInText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  divider: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: {
    marginHorizontal: 12, color: COLORS.muted, fontSize: 12,
  },
  biometricBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: 8, paddingVertical: 12,
    gap: 8, marginBottom: 16,
  },
  biometricText: {
    color: COLORS.primary, fontSize: 14, fontWeight: '500',
  },
  forgotText: {
    textAlign: 'center', fontSize: 11,
    color: COLORS.muted, marginBottom: 20,
  },
  createAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: '#D0DCFF',
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 8,
  },
  createAccountText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  createAccountSub: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.muted,
    marginBottom: 16,
  },
});