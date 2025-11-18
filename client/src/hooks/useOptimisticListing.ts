import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/errorHandler';

interface OptimisticUpdate<T> {
  data: T | null;
  isPending: boolean;
  error: Error | null;
  update: (updates: Partial<T>) => Promise<void>;
  rollback: () => void;
}

export function useOptimisticListing<T extends { id: number }>(
  initialData: T,
  tableName: string
): OptimisticUpdate<T> {
  const [data, setData] = useState<T>(initialData);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [previousData, setPreviousData] = useState<T>(initialData);

  const update = useCallback(
    async (updates: Partial<T>) => {
      // Save current state for rollback
      setPreviousData(data);

      // Optimistically update UI
      setData((prev) => ({ ...prev, ...updates } as T));
      setIsPending(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        // Persist to backend
        const { data: updatedData, error: updateError } = await supabase
          .from(tableName)
          .update(updates)
          .eq('id', data.id)
          .select()
          .single();

        if (updateError) throw handleSupabaseError(updateError);

        // Update with server response
        if (updatedData) {
          setData(updatedData as T);
        }
        setIsPending(false);
      } catch (err) {
        // Rollback on error
        setData(previousData);
        setError(err instanceof Error ? err : new Error('Update failed'));
        setIsPending(false);
      }
    },
    [data, tableName, previousData]
  );

  const rollback = useCallback(() => {
    setData(previousData);
    setIsPending(false);
    setError(null);
  }, [previousData]);

  return { data, isPending, error, update, rollback };
}

