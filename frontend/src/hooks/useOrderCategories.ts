import { useState, useEffect } from 'react';
import { baseUrl } from '../utils/constants';
import type { OrderCategory } from '../types/types';

export function useOrderCategories() {
  const [allCategories, setAllCategories] = useState<OrderCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${baseUrl}/admin/order-categories/all`, {
          method: "GET",
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error('Failed to fetch order categories');
        }

        const data = await response.json();
        if (data.data) {
          const sortedCategories = data.data.sort((a: OrderCategory, b: OrderCategory) => a.name.localeCompare(b.name));
          setAllCategories(sortedCategories);
        }
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return { categories: allCategories, loading, error };
} 