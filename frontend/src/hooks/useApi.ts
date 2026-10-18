import { useCallback, useEffect, useState } from 'react';
import { ApiError, clearApiCache } from '../services/api';

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  retry: () => void;
}

/** Load data from the API, tracking loading and error states. Re-runs when `deps` change. */
export function useApi<T>(load: () => Promise<T>, deps: unknown[]): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    load()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (!active || err?.name === 'AbortError') return;
        setData(null);
        setError(err instanceof ApiError ? err : new ApiError('server', null, 'Something went wrong while loading data.', String(err)));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const retry = useCallback(() => {
    clearApiCache();
    setAttempt((n) => n + 1);
  }, []);

  return { data, error, loading, retry };
}
