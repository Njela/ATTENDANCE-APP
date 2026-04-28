import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { getToken } from './authService';

export const getMyReport = async () => {
  const token = await getToken();
  const response = await axios.get(`${API_BASE_URL}/reports/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};