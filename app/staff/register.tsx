import { Ionicons } from '@expo/vector-icons';
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
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { getPostLoginRoute, getSession, mapAuthError, registerStaffAccount } from '../../src/services/authService';
import { theme } from '../../src/theme/tokens';

export default function StaffRegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      if (session) {
        router.replace(await getPostLoginRoute(session));
      }
    })();
  }, [router]);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
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
      Alert.alert('Email', 'Enter a valid work email.');
      return;
    }
    setLoading(true);
    try {
      const session = await registerStaffAccount({ name, contactEmail: email, password });
      router.replace(await getPostLoginRoute(session));
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
              <Ionicons name="school-outline" size={26} color="#fff" />
            </View>
            <Text style={styles.title}>Lecturer account</Text>
            <Text style={styles.subtitle}>Create access to the staff dashboard</Text>
          </View>

          <View style={styles.sheet}>
            <TextField
              label="Full name"
              icon="person-outline"
              placeholder="Dr. Jane Doe"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <TextField
              label="Work email"
              icon="mail-outline"
              placeholder="you@university.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.hint}>
              Same rules as students: use a real inbox and disable email confirmation in Supabase for demos.
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

            <PrimaryButton title="Create lecturer account" loading={loading} onPress={submit} />

            <Pressable style={styles.signIn} onPress={() => router.replace('/staff/login')}>
              <Text style={styles.signInText}>Already registered? Staff sign in</Text>
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
    backgroundColor: '#1a2744',
    alignItems: 'center',
  },
  back: { position: 'absolute', left: theme.space.lg, top: 48 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space.lg,
    marginTop: 8,
  },
  title: { color: '#fff', fontSize: 24, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.72)', marginTop: theme.space.sm, textAlign: 'center' },
  sheet: {
    marginTop: -theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.space.xl,
  },
  hint: {
    fontSize: theme.font.micro,
    color: theme.colors.textMuted,
    marginTop: -8,
    marginBottom: theme.space.md,
    lineHeight: 16,
  },
  signIn: { alignItems: 'center', marginTop: theme.space.lg },
  signInText: { color: theme.colors.accent, fontWeight: '600' },
});
