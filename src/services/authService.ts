import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({ baseURL: API_BASE_URL });

export const login = async (studentId: string, password: string) => {
  const response = await api.post('/auth/login', { studentId, password });
  const { token, student } = response.data;
  await AsyncStorage.setItem('token', token);
  await AsyncStorage.setItem('student', JSON.stringify(student));
  return student;
};

export const logout = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('student');
};

export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};

export const getStudent = async () => {
  const data = await AsyncStorage.getItem('student');
  return data ? JSON.parse(data) : null;
};