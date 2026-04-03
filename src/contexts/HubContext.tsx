import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { HubSettings } from '../types';

interface HubContextType {
  settings: HubSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const HubContext = createContext<HubContextType | undefined>(undefined);

export function HubProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<HubSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase.from('hub_settings').select('*').limit(1).maybeSingle();
    setSettings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <HubContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </HubContext.Provider>
  );
}

export function useHub() {
  const context = useContext(HubContext);
  if (!context) throw new Error('useHub must be used within HubProvider');
  return context;
}
