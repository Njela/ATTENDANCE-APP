import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { getPostLoginRoute } from '../src/services/authService';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        router.replace(await getPostLoginRoute());
      } else {
        router.replace('/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
