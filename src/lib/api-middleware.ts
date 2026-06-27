import { ApiError } from "@/lib/errors";
import { NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (...args: any[]) => Promise<unknown>;

export function withErrorHandler<T extends Handler>(handler: T): T {
  const wrapped = async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code, details: error.details },
          { status: error.statusCode }
        );
      }
      console.error("[UNHANDLED]", error instanceof Error ? error.message : error);
      return NextResponse.json(
        { error: "Error interno del servidor" },
        { status: 500 }
      );
    }
  };
  return wrapped as T;
}
