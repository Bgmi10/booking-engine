import { useState, useEffect } from 'react';
import { baseUrl } from '../utils/constants';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

export const useUserInfo = (userId: string | null) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUserInfo(null);
      return;
    }

    const fetchUserInfo = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`${baseUrl}/admin/users/${userId}`, {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserInfo(data.data);
        } else {
          setError('Failed to fetch user information');
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        setError('Error loading user information');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [userId]);

  return { userInfo, loading, error };
};