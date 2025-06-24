
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type TokenHijack = Database['public']['Tables']['token_hijacks']['Row'];

export const useHijackHistory = () => {
  const [hijacks, setHijacks] = useState<TokenHijack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHijacks = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('token_hijacks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        throw fetchError;
      }

      setHijacks(data || []);
    } catch (err) {
      console.error('Error fetching hijack history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch hijack history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHijacks();

    // Set up real-time subscription for new hijacks
    const channel = supabase
      .channel('hijacks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'token_hijacks'
        },
        (payload) => {
          console.log('Real-time hijack update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setHijacks(prev => [payload.new as TokenHijack, ...prev.slice(0, 19)]);
          } else if (payload.eventType === 'UPDATE') {
            setHijacks(prev => 
              prev.map(hijack => 
                hijack.id === payload.new.id ? payload.new as TokenHijack : hijack
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const refreshHijacks = () => {
    fetchHijacks();
  };

  return {
    hijacks,
    isLoading,
    error,
    refreshHijacks
  };
};
