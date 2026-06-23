import { NextResponse } from "next/server";

export type ApiResponse<T = unknown> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export function successResponse<T>(data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data, error: null };
  return NextResponse.json(body, { status });
}

export function errorResponse(error: string, status = 400) {
  const body: ApiResponse<null> = { success: false, data: null, error };
  return NextResponse.json(body, { status });
}
