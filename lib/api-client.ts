// ===========================================
// API Request Helper
// ===========================================

import { privateAxios, publicAxios } from "@/config/axios.config";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function apiRequest<T>(
  endpoint: string,
  options: {
    method: HttpMethod;
    body?: unknown;
    isPublic?: boolean;
  },
): Promise<T> {
  const axios = options.isPublic ? publicAxios : privateAxios;

  try {
    let response: { data: T };

    switch (options.method) {
      case "GET":
        response = await axios.get<T>(endpoint);
        break;
      case "DELETE":
        response = await axios.delete<T>(endpoint, {
          data: options.body ?? undefined,
        });
        break;
      case "POST":
        response = await axios.post<T>(endpoint, options.body ?? {});
        break;
      case "PUT":
        response = await axios.put<T>(endpoint, options.body ?? {});
        break;
      case "PATCH":
        response = await axios.patch<T>(endpoint, options.body ?? {});
        break;
      default:
        throw new Error(`Invalid HTTP method: ${options.method}`);
    }

    return response.data;
  } catch (error: unknown) {
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      if (axiosError.response?.data?.error) {
        throw new Error(axiosError.response.data.error);
      }
    }
    throw new Error("An unexpected error occurred");
  }
}

const api = {
  queries: {},
  mutations: {},
};
