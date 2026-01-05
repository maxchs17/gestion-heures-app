import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - Générer une facture pour un mois donné
export async function POST(request: NextRequest) {
  try {
    const { year, month, email } = await request.json();

    if (!year || !month) {
      return NextResponse.json(
        { error: 'Année et mois requis' },
        { status: 400 }
      );
    }

    // Utiliser l'email fourni ou récupérer l'email par défaut
    let recipientEmail = email;
    if (!recipientEmail) {
      try {
        const { data: settings } = await supabase
          .from('settings')
          .select('invoice_email')
          .eq('id', 1)
          .single();

        recipientEmail = settings?.invoice_email || 'Obaradise78@gmail.com';
      } catch (error) {
        console.error('Erreur récupération email par défaut:', error);
        recipientEmail = 'Obaradise78@gmail.com';
      }
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

    // Obtenir le prochain numéro de facture avec incrémentation automatique
    let invoiceNumber = '48-01';
    try {
      // Récupérer le compteur actuel
      const { data: counterData, error: selectError } = await supabase
        .from('invoice_counter')
        .select('current_number')
        .eq('id', 1)
        .single();

      if (!selectError && counterData) {
        const nextNumber = counterData.current_number + 1;

        // Mettre à jour le compteur
        const { error: updateError } = await supabase
          .from('invoice_counter')
          .update({
            current_number: nextNumber,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        if (!updateError) {
          // Formater le numéro (48-01, 48-02, etc.)
          invoiceNumber = `48-${String(nextNumber).padStart(2, '0')}`;
        }
      } else {
        console.error('Table invoice_counter non trouvée ou vide:', selectError);
        // Fallback: utiliser un numéro basé sur la date
        invoiceNumber = `${year}${String(month).padStart(2, '0')}`;
      }
    } catch (counterError) {
      console.error('Erreur compteur facture:', counterError);
      // En cas d'erreur, utiliser un numéro basé sur la date
      invoiceNumber = `${year}${String(month).padStart(2, '0')}`;
    }

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
      recipientEmail: recipientEmail,
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
