import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
  admin?: {
    name: string;
    username: string;
    avatar_url: string | null;
  };
}

export const useAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select(`
        *,
        admin:profiles!admin_audit_logs_admin_id_fkey(name, username, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data as AuditLog[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return { logs, loading, refetch: fetchLogs };
};
