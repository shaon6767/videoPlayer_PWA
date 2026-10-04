import axios from "axios";
import { ApiErrorResponse } from "@/lib/types";

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? fallback;
  }
  return fallback;
}
