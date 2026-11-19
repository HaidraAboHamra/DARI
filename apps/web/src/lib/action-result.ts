import { ApiError } from './api';

/** Uniform result for server actions consumed by useActionState. */
export interface ActionState {
  ok?: boolean;
  error?: string | null;
  fieldErrors?: Record<string, string>;
  message?: string | null;
}

export const initialState: ActionState = {};

/** Maps API failures to a form-friendly state; rethrows anything unexpected. */
export function toActionError(err: unknown): ActionState {
  if (err instanceof ApiError) {
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(err.details)) {
      for (const d of err.details as { path?: string; message?: string }[]) {
        if (d.path && d.message) fieldErrors[d.path] = d.message;
      }
    }
    return { error: err.message, fieldErrors };
  }
  throw err;
}

export function str(form: FormData, key: string): string | undefined {
  const value = form.get(key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

export function int(form: FormData, key: string): number | undefined {
  const value = str(form, key);
  if (value === undefined) return undefined;
  const n = Number(value.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}
