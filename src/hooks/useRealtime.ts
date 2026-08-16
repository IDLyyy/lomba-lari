'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeScans(onScan: (payload: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('checkpoint_scans_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'checkpoint_scans' },
        (payload) => onScan(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onScan]);
}

export function useRealtimeParticipants(onUpdate: (payload: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('participants_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'participants' },
        (payload) => onUpdate(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
