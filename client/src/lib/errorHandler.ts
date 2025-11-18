import type { PostgrestError } from '@supabase/supabase-js';

export class SupabaseError extends Error {
  code: string;
  details?: string;
  hint?: string;

  constructor(error: PostgrestError | Error) {
    const message = error.message || 'An unknown error occurred';
    super(message);
    this.name = 'SupabaseError';
    
    if ('code' in error) {
      this.code = error.code;
      this.details = error.details;
      this.hint = error.hint;
    } else {
      this.code = 'UNKNOWN';
      this.details = '';
      this.hint = '';
    }
  }

  isAuthError(): boolean {
    return this.code.startsWith('PGRST') || this.code === 'PGRST301';
  }

  isNetworkError(): boolean {
    return this.code === 'ECONNREFUSED' || this.code === 'ETIMEDOUT' || this.message.includes('fetch');
  }

  isConstraintViolation(): boolean {
    return this.code === '23505'; // Unique violation
  }

  isForeignKeyViolation(): boolean {
    return this.code === '23503'; // Foreign key violation
  }

  isNotNullViolation(): boolean {
    return this.code === '23502'; // Not null violation
  }

  getUserFriendlyMessage(): string {
    if (this.isConstraintViolation()) {
      if (this.details?.includes('vin')) {
        return 'This VIN is already in use. Please check your entry.';
      }
      if (this.details?.includes('email')) {
        return 'This email is already registered.';
      }
      return 'This record already exists.';
    }

    if (this.isForeignKeyViolation()) {
      return 'This record references data that does not exist.';
    }

    if (this.isNotNullViolation()) {
      return 'Required fields are missing.';
    }

    if (this.isNetworkError()) {
      return 'Network connection issue. Please check your internet and try again.';
    }

    if (this.isAuthError()) {
      if (this.code === 'PGRST301') {
        return 'You do not have permission to perform this action.';
      }
      return 'Authentication error. Please sign in again.';
    }

    return this.message || 'An unexpected error occurred.';
  }
}

export function handleSupabaseError(error: unknown): SupabaseError {
  if (error instanceof SupabaseError) {
    return error;
  }

  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return new SupabaseError(error as PostgrestError);
  }

  if (error instanceof Error) {
    return new SupabaseError(error);
  }

  return new SupabaseError({
    code: 'UNKNOWN',
    message: 'An unknown error occurred',
    details: '',
    hint: '',
  } as PostgrestError);
}

