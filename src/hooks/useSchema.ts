import { useState, useEffect } from 'react';
import { TableSchema, loadSchema } from '@/data/schema';

export function useSchema() {
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchema()
      .then(data => {
        setSchema(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  return { schema, isLoading, error };
}
