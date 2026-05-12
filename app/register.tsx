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
  Switch,
  Text,
  View,
} from 'react-native';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Screen } from '../src/components/ui/Screen';
import { TextField } from '../src/components/ui/TextField';
import {
  getPostLoginRoute,
  getSession,
  mapAuthError,
  registerAccount,
  setBiometricPreference,
} from '../src/services/authService';
import { theme } from '../src/theme/tokens';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [enableBio, setEnableBio] = useState(false);
  const [bioHardware, setBioHardware] = useState(false);
  const [bioLabel, setBioLabel] = useState('Biometric');

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      if (session) {
        router.replace(await getPostLoginRoute(session));
      }
    })();
  }, [router]);

  useEffect(() => {
    void (async () => {
      const ok = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBioHardware(ok && enrolled);
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBioLabel('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBioLabel('Fingerprint');
      }
    })();
  }, []);

  const submit = async () => {
    if (!name.trim() || !studentId.trim() || !email.trim() || !password || !confirm) {
      Alert.alert('Missing fields', 'Fill in every field.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password', 'Use at least 6 characters.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Email', 'Enter a valid contact email.');
      return;
    }
    setLoading(true);
    try {
      const { session: newSession } = await registerAccount({
        studentId,
        name,
        contactEmail: email,
        password,
        course: 'Mobile Computing',
      });

      if (enableBio && bioHardware) {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm to enable quick unlock',
          cancelLabel: 'Skip',
          fallbackLabel: 'Skip',
        });
        await setBiometricPreference(auth.success);
        if (!auth.success) {
          Alert.alert('Account ready', `${bioLabel} unlock was skipped.`);
        }
      } else {
        await setBiometricPreference(false);
      }

      router.replace(await getPostLoginRoute(newSession));
    } catch (e) {
      Alert.alert('Registration failed', mapAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Pressable style={styles.back} onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.logo}>
              <Ionicons name="person-add" size={26} color="#fff" />
            </View>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join your class on AttendTrack</Text>
          </View>

          <View style={styles.sheet}>
            <TextField
              label="Full name"
              icon="person-outline"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextField
              label="Student ID"
              icon="id-card-outline"
              placeholder="e.g. SCM211-0001/2022"
              value={studentId}
              onChangeText={setStudentId}
              autoCapitalize="characters"
            />
            <TextField
              label="Sign-in email"
              icon="mail-outline"
              placeholder="you@university.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.emailHint}>
              Use a real inbox you can access. This is your username for sign-in (with your password).
            </Text>
            <TextField
              label="Password"
              icon="lock-closed-outline"
              placeholder="Min. 6 characters"
              value={password}
              onChangeText={setPassword}
              secureToggle
              autoCapitalize="none"
            />
            <TextField
              label="Confirm password"
              icon="lock-closed-outline"
              placeholder="Repeat password"
              value={confirm}
              onChangeText={setConfirm}
              secureToggle
              autoCapitalize="none"
            />

            {bioHardware ? (
              <View style={styles.bioRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bioTitle}>Enable {bioLabel}</Text>
                  <Text style={styles.bioSub}>Unlock faster next time</Text>
                </View>
                <Switch value={enableBio} onValueChange={setEnableBio} />
              </View>
            ) : null}

            <PrimaryButton title="Create account" loading={loading} onPress={submit} />

            <Pressable style={styles.staffRow} onPress={() => router.push('/staff/register')}>
              <Ionicons name="school-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.staffLink}>Lecturer? Create a staff account</Text>
            </Pressable>

            <Pressable style={styles.signIn} onPress={() => router.back()}>
              <Text style={styles.signInText}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  hero: {
    paddingTop: 48,
    paddingBottom: 36,
    paddingHorizontal: theme.space.xl,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  back: { position: 'absolute', left: theme.space.lg, top: 48 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.lg,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.72)', marginTop: theme.space.sm },
  sheet: {
    marginTop: -theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.space.xl,
  },
  bioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.space.lg,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.space.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  bioTitle: { fontWeight: '600', color: theme.colors.text },
  bioSub: { color: theme.colors.textMuted, fontSize: theme.font.small, marginTop: 2 },
  emailHint: {
    fontSize: theme.font.micro,
    color: theme.colors.textMuted,
    marginTop: -8,
    marginBottom: theme.space.md,
    lineHeight: 16,
  },
  signIn: { alignItems: 'center', marginTop: theme.space.lg },
  signInText: { color: theme.colors.accent, fontWeight: '600' },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.space.md,
    marginTop: theme.space.sm,
  },
  staffLink: { color: theme.colors.accent, fontWeight: '600', fontSize: theme.font.small },
});
