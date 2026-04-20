import { useState } from 'react'
import {
  Alert, KeyboardAvoidingView, Platform,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View
} from 'react-native'

export default function LoginScreen() {
  const [studentId, setStudentId] = useState('')
  const [password, setPassword]   = useState('')

  const handleLogin = () => {
    if (!studentId || !password) {
      Alert.alert('Error', 'Please enter your Student ID and password')
      return
    }
    Alert.alert('Success', `Welcome ${studentId}!`)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>📍</Text>
        </View>
        <Text style={styles.title}>Attendance App</Text>
        <Text style={styles.subtitle}>Sign in to mark your attendance</Text>
        <Text style={styles.label}>Student ID</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter your student ID'
          value={studentId}
          onChangeText={setStudentId}
          autoCapitalize='none'
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder='Enter your password'
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8FAFC' },
  inner:      { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoBox:    { width: 80, height: 80, borderRadius: 20, backgroundColor: '#1E3A8A', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  logoText:   { fontSize: 36 },
  title:      { fontSize: 28, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  subtitle:   { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 32 },
  label:      { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:      { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, marginBottom: 16, color: '#0F172A' },
  button:     { backgroundColor: '#1E3A8A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
})