import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Récupérer tous les horaires
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('status', 'approved')
      .order('date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erreur GET time_entries:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des horaires' },
      { status: 500 }
    );
  }
}

// POST - Créer ou mettre à jour un horaire
export async function POST(request: NextRequest) {
  try {
    const { date, start_time, end_time } = await request.json();

    // Vérifier si une entrée existe déjà pour cette date
    const { data: existing } = await supabase
      .from('time_entries')
      .select('id')
      .eq('date', date)
      .single();

    let result;

    if (existing) {
      // Mettre à jour
      result = await supabase
        .from('time_entries')
        .update({
          start_time,
          end_time,
          status: 'approved',
          created_by: 'admin',
          updated_at: new Date().toISOString(),
        })
        .eq('date', date)
        .select();
    } else {
      // Créer
      result = await supabase
        .from('time_entries')
        .insert({
          date,
          start_time,
          end_time,
          status: 'approved',
          created_by: 'admin',
        })
        .select();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Erreur POST time_entries:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde des horaires' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un horaire
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date requise' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('date', date);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur DELETE time_entries:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de l\'horaire' },
      { status: 500 }
    );
  }
}
