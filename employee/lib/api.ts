import axios from "axios";
import type { OperationsTransport } from "@cruisin/operations-ui";
const root = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8192/api/v1"
).replace(/\/$/, "");
export const employeeApi = axios.create({
  baseURL: `${root}/employee`,
  withCredentials: true,
  timeout: 20000,
});
let csrf = "";
export const setEmployeeCsrf = (value: string): void => {
  csrf = value;
};
employeeApi.interceptors.request.use((config) => {
  if (csrf) config.headers["X-Employee-Csrf"] = csrf;
  return config;
});
export const employeeTransport: OperationsTransport = {
  async get<T>(path: string): Promise<T> {
    return (await employeeApi.get<{ data: T }>(path)).data.data;
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    return (await employeeApi.post<{ data: T }>(path, body)).data.data;
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    return (await employeeApi.patch<{ data: T }>(path, body)).data.data;
  },
  async delete<T>(path: string): Promise<T> {
    return (await employeeApi.delete<{ data: T }>(path)).data.data;
  },
  publicUrl(path: string): string {
    return `${root}${path}`;
  },
};
employeeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;
    error.message =
      typeof data?.message === "string" ? data.message : error.message;
    return Promise.reject(error);
  },
);
