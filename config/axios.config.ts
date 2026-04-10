import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Public axios instance (no auth required)
export const publicAxios = axios.create({
  baseURL: `${baseURL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Private axios instance (auth required - cookies are sent automaTiClly)
export const privateAxios = axios.create({
  baseURL: `${baseURL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Send cookies with requests
});
