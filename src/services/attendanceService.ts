import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { getToken } from './authService';

const getAuthHeaders = async () => {
  const token = await getToken();
  return { Authorization: `Bearer ${token}` };
};

export const markAttendance = async (
  latitude: number,
  longitude: number,
  weekNumber: number
) => {
  const headers = await getAuthHeaders();
  const response = await axios.post(
    `${API_BASE_URL}/attendance/mark`,
    { latitude, longitude, weekNumber },
    { headers }
  );
  return response.data;
};

export const getMyAttendance = async () => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/attendance/my`, { headers });
  return response.data;
};