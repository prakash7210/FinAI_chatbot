import axios from 'axios';
const USE_WIFI = true; // toggle this based on your testing environment
const API = axios.create({
  baseURL: USE_WIFI
    ? 'http://192.168.0.100:8000/api'
    : 'http://10.248.168.231:8000/api',
  timeout: 15000,
});

export default API;
