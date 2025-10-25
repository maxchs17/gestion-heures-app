import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - Générer une facture pour un mois donné
export async function POST(request: NextRequest) {
  try {
    const { year, month } = await request.json();

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Année et mois requis' },
        { status: 400 }
      );
    }

    // Calculer la date de début et de fin du mois
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Récupérer toutes les entrées du mois
    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('status', 'approved')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (error) throw error;

    // Calculer les heures
    const calculateHours = (start: string, end: string) => {
      if (!start || !end) return 0;
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      const startTotal = startHour + startMin / 60;
      let endTotal = endHour + endMin / 60;

      if (endTotal <= 6 || endTotal < startTotal) {
        endTotal += 24;
      }

      return Math.max(0, endTotal - startTotal);
    };

    const totalHours = entries?.reduce((total, entry) => {
      return total + calculateHours(entry.start_time, entry.end_time);
    }, 0) || 0;

    const totalAmount = totalHours * 15; // 15€/heure

    // Préparer les données pour n8n
    const invoiceNumber = `46-${String(month).padStart(2, '0')}`;
    const invoiceData = {
      year,
      month,
      invoiceNumber,
      monthName: new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      date: new Date().toLocaleDateString('fr-FR'),
      entries: entries?.map(entry => ({
        date: entry.date,
        startTime: entry.start_time,
        endTime: entry.end_time,
        hours: calculateHours(entry.start_time, entry.end_time),
      })) || [],
      totalHours: totalHours.toFixed(2),
      hourlyRate: 15,
      totalAmount: totalAmount.toFixed(2),
      clientName: 'Olivier',
      providerName: 'Maxence',
    };

    // Appeler le webhook n8n
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'https://n8n.garagesync.io/webhook/generate-invoice';

    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!n8nResponse.ok) {
        console.error('Erreur n8n:', await n8nResponse.text());
      }
    } catch (n8nError) {
      console.error('Erreur appel n8n:', n8nError);
      // On continue même si n8n échoue pour ne pas bloquer l'utilisateur
    }

    return NextResponse.json({
      success: true,
      data: invoiceData,
      message: 'Facture en cours de génération'
    });
  } catch (error) {
    console.error('Erreur génération facture:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la facture' },
      { status: 500 }
    );
  }
}
