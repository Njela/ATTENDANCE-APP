import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Screen } from '../src/components/ui/Screen';
import { TextField } from '../src/components/ui/TextField';
import {
  getBiometricPreference,
  getPostLoginRoute,
  getSession,
  getStudent,
  login,
  mapAuthError,
} from '../src/services/authService';
import { theme } from '../src/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric');

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      if (session) {
        router.replace(await getPostLoginRoute(session));
        return;
      }
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const bio = await getBiometricPreference();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (compatible && enrolled && bio) {
        setBiometricAvailable(true);
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricLabel('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricLabel('Fingerprint');
        }
      }
    })();
  }, [router]);

  const handleLogin = async () => {
    if (!studentId.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your school email (or Student ID) and password.');
      return;
    }
    setLoading(true);
    try {
      const session = await login(studentId.trim(), password);
      router.replace(await getPostLoginRoute(session));
    } catch (e) {
      Alert.alert('Sign in failed', mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    const session = await getSession();
    const profile = await getStudent();
    if (!session || !profile) {
      Alert.alert(
        'No saved session',
        'Sign in with your email (or Student ID) and password first to enable quick unlock.'
      );
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Unlock as ${profile.full_name}`,
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
    });
    if (result.success) {
      router.replace(await getPostLoginRoute(session));
    } else if (result.error !== 'user_cancel') {
      Alert.alert('Unlock failed', 'Try password sign-in.');
    }
  };

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons name="navigate" size={28} color="#fff" />
            </View>
            <Text style={styles.title}>AttendTrack</Text>
            <Text style={styles.subtitle}>GPS attendance for your classroom</Text>
          </View>

          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Welcome back</Text>
            <Text style={styles.sheetHint}>
              Use the same email you registered with, or your Student ID.
            </Text>

            <TextField
              label="Email or Student ID"
              icon="id-card-outline"
              placeholder="you@school.edu or SCM211-0001/2022"
              value={studentId}
              onChangeText={setStudentId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="Password"
              icon="lock-closed-outline"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureToggle
              autoCapitalize="none"
            />

            <PrimaryButton title="Sign in" loading={loading} onPress={handleLogin} />

            {biometricAvailable ? (
              <>
                <View style={styles.divider}>
                  <View style={styles.line} />
                  <Text style={styles.or}>or</Text>
                  <View style={styles.line} />
                </View>
                <PrimaryButton
                  title={`Unlock with ${biometricLabel}`}
                  variant="secondary"
                  onPress={handleBiometric}
                />
              </>
            ) : null}

            <Text style={styles.help}>
              Forgot password? Reset via your administrator or register again with a new ID.
            </Text>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.or}>new</Text>
              <View style={styles.line} />
            </View>

            <Pressable style={styles.linkRow} onPress={() => router.push('/register')}>
              <Ionicons name="person-add-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.link}>Create an account</Text>
            </Pressable>

            <Pressable style={styles.linkRow} onPress={() => router.push('/staff/login')}>
              <Ionicons name="school-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.link}>Teaching staff sign-in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    paddingTop: 52,
    paddingBottom: 40,
    paddingHorizontal: theme.space.xl,
    backgroundColor: theme.colors.accent,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.lg,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.72)', marginTop: theme.space.sm, fontSize: theme.font.small },
  sheet: {
    flex: 1,
    marginTop: -theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.space.xl,
    paddingBottom: 40,
  },
  sheetTitle: { fontSize: theme.font.title, fontWeight: '700', color: theme.colors.text },
  sheetHint: { color: theme.colors.textMuted, marginTop: theme.space.sm, marginBottom: theme.space.lg },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: theme.space.lg },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  or: { marginHorizontal: theme.space.md, color: theme.colors.textMuted, fontSize: theme.font.small },
  help: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: theme.font.micro,
    marginTop: theme.space.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.space.md,
  },
  link: { color: theme.colors.accent, fontWeight: '600', fontSize: theme.font.body },
});
