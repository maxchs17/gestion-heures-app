'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, UserCog, User } from 'lucide-react';

export default function LoginPage() {
  const [selectedUser, setSelectedUser] = useState<'admin' | 'client' | 'jade' | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedUser) {
      setError('Veuillez sélectionner un utilisateur');
      return;
    }

    setLoading(true);

    try {
      // Utiliser le username correspondant
      const username = selectedUser === 'admin' ? 'admin' : selectedUser === 'jade' ? 'jade' : 'client';

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Stocker le token, le rôle et le username dans localStorage
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_role', data.role);
        localStorage.setItem('username', data.username);

        // Rediriger selon le rôle
        if (data.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/client');
        }
      } else {
        setError(data.error || 'Mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3 justify-center mb-4">
            <Calendar className="text-primary" size={40} />
            <CardTitle className="text-2xl">Gestion des Heures</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <Label>Sélectionner l'utilisateur</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUser('admin')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedUser === 'admin'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <UserCog size={36} className={selectedUser === 'admin' ? 'text-primary' : 'text-muted-foreground'} />
                  <span className={`font-medium text-sm ${selectedUser === 'admin' ? 'text-primary' : 'text-foreground'}`}>
                    Maxence
                  </span>
                  <span className="text-xs text-muted-foreground">Admin</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedUser('client')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedUser === 'client'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <User size={36} className={selectedUser === 'client' ? 'text-primary' : 'text-muted-foreground'} />
                  <span className={`font-medium text-sm ${selectedUser === 'client' ? 'text-primary' : 'text-foreground'}`}>
                    Olivier
                  </span>
                  <span className="text-xs text-muted-foreground">Client</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedUser('jade')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    selectedUser === 'jade'
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <User size={36} className={selectedUser === 'jade' ? 'text-primary' : 'text-muted-foreground'} />
                  <span className={`font-medium text-sm ${selectedUser === 'jade' ? 'text-primary' : 'text-foreground'}`}>
                    Jade/Maud
                  </span>
                  <span className="text-xs text-muted-foreground">Client</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="Entrez votre mot de passe"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !selectedUser}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
