import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Récupérer les demandes de modification
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'rejected'

    let query = supabase
      .from('modification_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erreur GET modification_requests:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des demandes' },
      { status: 500 }
    );
  }
}

// POST - Créer une demande de modification
export async function POST(request: NextRequest) {
  try {
    const { date, start_time, end_time, comment } = await request.json();

    const { data, error } = await supabase
      .from('modification_requests')
      .insert({
        date,
        start_time,
        end_time,
        comment,
        status: 'pending',
        created_by: 'client',
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erreur POST modification_requests:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la demande' },
      { status: 500 }
    );
  }
}

// PATCH - Mettre à jour le statut d'une demande
export async function PATCH(request: NextRequest) {
  try {
    const { id, status, admin_comment } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Statut invalide' },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (admin_comment) {
      updateData.admin_comment = admin_comment;
    }

    // Si approuvé, mettre à jour time_entries
    if (status === 'approved') {
      const { data: request_data } = await supabase
        .from('modification_requests')
        .select('date, start_time, end_time, comment')
        .eq('id', id)
        .single();

      if (request_data) {
        // Si c'est une demande de suppression
        if (request_data.comment === 'SUPPRESSION DEMANDÉE') {
          await supabase
            .from('time_entries')
            .delete()
            .eq('date', request_data.date);
        } else {
          // Vérifier si une entrée existe déjà pour cette date
          const { data: existing } = await supabase
            .from('time_entries')
            .select('id')
            .eq('date', request_data.date)
            .single();

          if (existing) {
            // Mettre à jour
            await supabase
              .from('time_entries')
              .update({
                start_time: request_data.start_time,
                end_time: request_data.end_time,
                status: 'approved',
                updated_at: new Date().toISOString(),
              })
              .eq('date', request_data.date);
          } else {
            // Créer
            await supabase
              .from('time_entries')
              .insert({
                date: request_data.date,
                start_time: request_data.start_time,
                end_time: request_data.end_time,
                status: 'approved',
                created_by: 'client',
              });
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('modification_requests')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Erreur PATCH modification_requests:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la demande' },
      { status: 500 }
    );
  }
}
