import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Pour simplifier, on va utiliser des credentials hardcodés
    // En production, vous devriez utiliser bcrypt pour hasher les mots de passe
    const validCredentials = [
      { username: 'admin', password: 'admin123', role: 'admin' },
      { username: 'client', password: 'client123', role: 'client' },
    ];

    const user = validCredentials.find(
      (cred) => cred.username === username && cred.password === password
    );

    if (user) {
      // Générer un token simple (en production, utilisez JWT)
      const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');

      return NextResponse.json({
        success: true,
        token,
        role: user.role,
      });
    } else {
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
