'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, FileText, LogOut, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/mode-toggle';
import { toast } from 'sonner';

export default function ClientPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<Record<string, { start: string; end: string }>>({});
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [comment, setComment] = useState('');
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Vérifier l'authentification
    const role = localStorage.getItem('user_role');
    if (role !== 'client') {
      router.push('/login');
      return;
    }

    // Charger les données depuis Supabase
    loadTimeEntries();
    checkPendingRequests();
  }, [router]);

  const loadTimeEntries = async () => {
    try {
      const response = await fetch('/api/time-entries');
      const result = await response.json();

      if (result.success && result.data) {
        const entries: Record<string, { start: string; end: string }> = {};

        result.data.forEach((entry: any) => {
          const date = new Date(entry.date);
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          entries[key] = {
            start: entry.start_time.substring(0, 5),
            end: entry.end_time.substring(0, 5),
          };
        });

        setTimeEntries(entries);
      }
    } catch (error) {
      console.error('Erreur chargement horaires:', error);
    }
  };

  const checkPendingRequests = async () => {
    try {
      const response = await fetch('/api/modification-requests?status=pending');
      const result = await response.json();

      if (result.success && result.data) {
        setHasPendingRequests(result.data.length > 0);
      }
    } catch (error) {
      console.error('Erreur vérification demandes:', error);
    }
  };

  // Formater l'heure en HH:MM
  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5); // Prend seulement HH:MM
  };

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

  const getTotalHours = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    return Object.entries(timeEntries).reduce((total, [key, entry]) => {
      if (key.startsWith(`${year}-${month}-`)) {
        return total + calculateHours(entry.start, entry.end);
      }
      return total;
    }, 0);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  const openRequestDialog = (day: number) => {
    const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
    const entry = timeEntries[key];
    if (entry) {
      setStartTime(entry.start);
      setEndTime(entry.end);
    } else {
      setStartTime('09:00');
      setEndTime('17:00');
    }
    setComment('');
    setEditingDay(day);
  };

  const submitModificationRequest = async () => {
    if (editingDay) {
      setLoading(true);
      const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(editingDay).padStart(2, '0')}`;

      try {
        const response = await fetch('/api/modification-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            start_time: startTime,
            end_time: endTime,
            comment: comment || null,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setHasPendingRequests(true);
          setEditingDay(null);
          toast.success('Demande de modification envoyée à Maxence');
        } else {
          toast.error('Erreur lors de l\'envoi de la demande');
        }
      } catch (error) {
        console.error('Erreur envoi demande:', error);
        toast.error('Erreur lors de l\'envoi de la demande');
      } finally {
        setLoading(false);
      }
    }
  };

  const submitDeletionRequest = async () => {
    if (editingDay) {
      setLoading(true);
      const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(editingDay).padStart(2, '0')}`;

      try {
        const response = await fetch('/api/modification-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            start_time: '00:00',
            end_time: '00:00',
            comment: 'SUPPRESSION DEMANDÉE',
          }),
        });

        const result = await response.json();

        if (result.success) {
          setHasPendingRequests(true);
          setEditingDay(null);
          toast.success('Demande de suppression envoyée à Maxence');
        } else {
          toast.error('Erreur lors de l\'envoi de la demande');
        }
      } catch (error) {
        console.error('Erreur envoi demande:', error);
        toast.error('Erreur lors de l\'envoi de la demande');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    router.push('/login');
  };

  const generateInvoice = async () => {
    if (hasPendingRequests) {
      toast.warning('Vous avez des demandes de modification en attente. Veuillez attendre la validation de Maxence avant de générer la facture.');
      return;
    }

    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    try {
      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Facture pour ${monthName} générée avec succès! Total: ${result.data.totalHours}h - ${result.data.totalAmount}€`);
      } else {
        toast.error('Erreur lors de la génération de la facture');
      }
    } catch (error) {
      console.error('Erreur génération facture:', error);
      toast.error('Erreur lors de la génération de la facture');
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    const headers = dayNames.map(day => (
      <div key={day} className="text-center font-semibold text-muted-foreground p-2">
        {day}
      </div>
    ));

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
      const entry = timeEntries[key];
      const hours = entry ? calculateHours(entry.start, entry.end) : 0;

      days.push(
        <div
          key={day}
          onClick={() => openRequestDialog(day)}
          className="border border-border p-2 min-h-20 cursor-pointer hover:bg-accent transition-colors rounded-md"
        >
          <div className="font-semibold text-foreground">{day}</div>
          {entry && (
            <div className="text-xs mt-1">
              <div className="text-muted-foreground">
                {formatTime(entry.start)} - {formatTime(entry.end)}
              </div>
              <div className="text-primary font-semibold">{hours.toFixed(1)}h</div>
            </div>
          )}
        </div>
      );
    }

    const totalCells = firstDay + daysInMonth;
    const cellsNeeded = 42;
    const emptyCellsAtEnd = cellsNeeded - totalCells;

    for (let i = 0; i < emptyCellsAtEnd; i++) {
      days.push(<div key={`empty-end-${i}`} className="p-2 min-h-20"></div>);
    }

    return (
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => changeMonth(-1)}
              size="sm"
            >
              ← Précédent
            </Button>
            <h2 className="text-xl font-semibold">
              {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <Button
              variant="outline"
              onClick={() => changeMonth(1)}
              size="sm"
            >
              Suivant →
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1">
            {headers}
            {days}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full">
        {/* En-tête */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="text-primary" size={32} />
                <div>
                  <h1 className="text-3xl font-bold">Gestion des Heures</h1>
                  <p className="text-sm text-muted-foreground">Olivier</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ModeToggle />
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut size={18} />
                  Déconnexion
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasPendingRequests && (
          <Card className="mb-6 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-orange-600" size={24} />
                <div>
                  <p className="font-semibold text-orange-900 dark:text-orange-100">
                    Demandes en attente de validation
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Vous ne pouvez pas générer de facture tant que Maxence n'a pas validé vos demandes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Calendrier */}
        {renderCalendar()}

        {/* Récapitulatif et actions */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Récapitulatif */}
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-end gap-4">
                    <Clock className="text-primary" size={40} />
                    <div className="text-3xl font-bold text-primary">
                      {getTotalHours().toFixed(2)}h
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Total du mois</div>
                </CardContent>
              </Card>

              {/* Bouton Générer facture */}
              <Button
                onClick={generateInvoice}
                variant="default"
                className="h-full gap-3"
                disabled={hasPendingRequests}
              >
                <FileText size={24} />
                Générer la facture
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal de demande de modification */}
        <Dialog open={editingDay !== null} onOpenChange={(open) => !open && setEditingDay(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Demander une modification - {editingDay} {currentDate.toLocaleDateString('fr-FR', { month: 'long' })}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Heure de début</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time">Heure de fin (si ≤ 06h, compte pour le lendemain)</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment">Commentaire (optionnel)</Label>
                <Input
                  id="comment"
                  type="text"
                  placeholder="Raison de la modification..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="text-base"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium text-muted-foreground">Durée totale</span>
                <span className="text-lg font-bold text-primary">
                  {calculateHours(startTime, endTime).toFixed(2)}h
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="destructive"
                onClick={submitDeletionRequest}
                disabled={loading}
                className="gap-2"
              >
                <Trash2 size={16} />
                Demander suppression
              </Button>
              <Button onClick={submitModificationRequest} disabled={loading}>
                {loading ? 'Envoi...' : 'Envoyer la demande'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
