import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic hook for reading/writing a single key in AsyncStorage.
 * Returns [value, setValue, loading, error].
 */
export function useAsyncStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => Promise<void>, boolean, Error | null] {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!mounted) return;
        if (raw !== null) {
          setValue(JSON.parse(raw));
        }
      })
      .catch((e) => {
        if (mounted) setError(e);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [key]);

  const set = useCallback(
    async (newValue: T) => {
      try {
        await AsyncStorage.setItem(key, JSON.stringify(newValue));
        setValue(newValue);
      } catch (e) {
        setError(e as Error);
      }
    },
    [key]
  );

  return [value, set, loading, error];
}
