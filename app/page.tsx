'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const token = localStorage.getItem('auth_token');
    const role = localStorage.getItem('user_role');

    if (token && role) {
      // Rediriger vers la page appropriée
      router.push(role === 'admin' ? '/admin' : '/client');
    } else {
      // Rediriger vers la page de login
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Redirection...</div>
    </div>
  );
}
