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
import {
  getPostLoginRoute,
  getSession,
  login,
  mapAuthError,
} from '../../src/services/authService';
import { theme } from '../../src/theme/tokens';

export default function StaffLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const session = await getSession();
      if (session) {
        router.replace(await getPostLoginRoute(session));
      }
    })();
  }, [router]);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your work email and password.');
      return;
    }
    setLoading(true);
    try {
      const session = await login(email.trim(), password);
      router.replace(await getPostLoginRoute(session));
    } catch (e) {
      Alert.alert('Sign in failed', mapAuthError(e));
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Pressable style={styles.back} onPress={() => router.replace('/login')} hitSlop={12}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.logo}>
              <Ionicons name="school-outline" size={28} color="#fff" />
            </View>
            <Text style={styles.title}>Staff portal</Text>
            <Text style={styles.subtitle}>Manage classes and view attendance</Text>
            <Text style={styles.accessHint}>
              From the student app home, use “Teaching staff sign-in”. Configure each week, drop the map pin on JKUAT, then turn on “Registration open” when the class may check in.
            </Text>
          </View>

          <View style={styles.sheet}>
            <TextField
              label="Work email"
              icon="mail-outline"
              placeholder="you@university.edu"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
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

            <Pressable style={styles.linkRow} onPress={() => router.push('/staff/register')}>
              <Ionicons name="person-add-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.link}>Register as lecturer</Text>
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.or}>students</Text>
              <View style={styles.line} />
            </View>

            <Pressable style={styles.linkRow} onPress={() => router.replace('/login')}>
              <Ionicons name="navigate-outline" size={18} color={theme.colors.accent} />
              <Text style={styles.link}>Open student app sign-in</Text>
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
    backgroundColor: '#1a2744',
  },
  back: { position: 'absolute', left: theme.space.lg, top: 52, zIndex: 2 },
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
  title: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.72)', marginTop: theme.space.sm, fontSize: theme.font.small },
  accessHint: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: theme.space.md,
    fontSize: theme.font.micro,
    lineHeight: 18,
    maxWidth: 320,
  },
  sheet: {
    flex: 1,
    marginTop: -theme.radius.xl,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.space.xl,
    paddingBottom: 40,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: theme.space.lg },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.border },
  or: { marginHorizontal: theme.space.md, color: theme.colors.textMuted, fontSize: theme.font.small },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: theme.space.md,
  },
  link: { color: theme.colors.accent, fontWeight: '600', fontSize: theme.font.body },
});
