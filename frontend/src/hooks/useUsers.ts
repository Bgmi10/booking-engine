import { useState, useEffect } from 'react';
import { baseUrl } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types/types';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${baseUrl}/admin/users/all`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      
      // Filter out the current logged-in user
      const filteredUsers = (data.data || []).filter((user: User) => user.id !== currentUser?.id);
      setUsers(filteredUsers);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser?.id]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    setUsers
  };
};