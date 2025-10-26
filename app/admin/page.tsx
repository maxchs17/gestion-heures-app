'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, FileText, LogOut, Bell, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/mode-toggle';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function TimesheetApp() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeEntries, setTimeEntries] = useState<Record<string, { start: string; end: string }>>({});
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);
  const [modificationRequests, setModificationRequests] = useState<any[]>([]);
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const router = useRouter();

  // Charger les horaires depuis Supabase
  useEffect(() => {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin') {
      router.push('/login');
      return;
    }

    loadTimeEntries();
    loadModificationRequests();
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

  const loadModificationRequests = async () => {
    try {
      const response = await fetch('/api/modification-requests?status=pending');
      const result = await response.json();

      if (result.success && result.data) {
        setModificationRequests(result.data);
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    }
  };

  const handleRequestAction = async (id: number, action: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const response = await fetch('/api/modification-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: action }),
      });

      const result = await response.json();

      if (result.success) {
        // Recharger les données
        await loadModificationRequests();
        await loadTimeEntries();
        toast.success(action === 'approved' ? 'Demande approuvée' : 'Demande rejetée');
      } else {
        toast.error('Erreur lors du traitement de la demande');
      }
    } catch (error) {
      console.error('Erreur traitement demande:', error);
      toast.error('Erreur lors du traitement de la demande');
    } finally {
      setLoading(false);
    }
  };

  // Obtenir le nombre de jours dans le mois
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  // Obtenir le premier jour du mois (0 = dimanche, 1 = lundi, etc.)
  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  // Formater l'heure en HH:MM
  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5); // Prend seulement HH:MM
  };

  // Calculer les heures travaillées
  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startTotal = startHour + startMin / 60;
    let endTotal = endHour + endMin / 60;

    // Si l'heure de fin est inférieure ou égale à 06h00, ou si elle est inférieure au début,
    // on considère que c'est le lendemain
    if (endTotal <= 6 || endTotal < startTotal) {
      endTotal += 24;
    }

    return Math.max(0, endTotal - startTotal);
  };

  // Calculer le total d'heures du mois
  const getTotalHours = () => {
    return Object.values(timeEntries).reduce((total, entry) => {
      return total + calculateHours(entry.start, entry.end);
    }, 0);
  };

  // Sauvegarder les horaires
  const saveTimeEntry = async () => {
    if (editingDay) {
      setLoading(true);
      const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(editingDay).padStart(2, '0')}`;
      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${editingDay}`;

      try {
        const response = await fetch('/api/time-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date,
            start_time: startTime,
            end_time: endTime,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setTimeEntries({
            ...timeEntries,
            [key]: { start: startTime, end: endTime }
          });
          setEditingDay(null);
          toast.success('Horaires sauvegardés avec succès');
        } else {
          toast.error('Erreur lors de la sauvegarde des horaires');
        }
      } catch (error) {
        console.error('Erreur sauvegarde:', error);
        toast.error('Erreur lors de la sauvegarde des horaires');
      } finally {
        setLoading(false);
      }
    }
  };

  // Supprimer un horaire
  const deleteTimeEntry = async () => {
    if (editingDay) {
      setLoading(true);
      const date = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(editingDay).padStart(2, '0')}`;
      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${editingDay}`;

      try {
        const response = await fetch(`/api/time-entries?date=${date}`, {
          method: 'DELETE',
        });

        const result = await response.json();

        if (result.success) {
          const newEntries = { ...timeEntries };
          delete newEntries[key];
          setTimeEntries(newEntries);
          setEditingDay(null);
          toast.success('Service supprimé avec succès');
        } else {
          toast.error('Erreur lors de la suppression');
        }
      } catch (error) {
        console.error('Erreur suppression:', error);
        toast.error('Erreur lors de la suppression');
      } finally {
        setLoading(false);
      }
    }
  };

  // Ouvrir le dialogue d'édition
  const openEditDialog = (day: number) => {
    const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
    const entry = timeEntries[key];
    if (entry) {
      setStartTime(entry.start);
      setEndTime(entry.end);
    } else {
      setStartTime('09:00');
      setEndTime('17:00');
    }
    setEditingDay(day);
  };

  // Générer la facture
  const generateInvoice = async () => {
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

  // Changer de mois
  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setCurrentDate(newDate);
  };

  // Déconnexion
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_role');
    router.push('/login');
  };

  // Générer le calendrier
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    // En-têtes des jours
    const headers = dayNames.map(day => (
      <div key={day} className="text-center font-semibold text-muted-foreground p-2">
        {day}
      </div>
    ));

    // Cellules vides pour aligner le premier jour
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
      const entry = timeEntries[key];
      const hours = entry ? calculateHours(entry.start, entry.end) : 0;

      days.push(
        <div
          key={day}
          onClick={() => openEditDialog(day)}
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

    // Cellules vides pour compléter jusqu'à 6 lignes (42 cellules au total)
    const totalCells = firstDay + daysInMonth;
    const cellsNeeded = 42; // 7 colonnes × 6 lignes
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
                  <p className="text-sm text-muted-foreground">Maxence</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <ModeToggle />
                <Button
                  variant="outline"
                  onClick={() => setShowRequestsDialog(true)}
                  className="gap-2 relative"
                >
                  <Bell size={18} />
                  Demandes
                  {modificationRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {modificationRequests.length}
                    </Badge>
                  )}
                </Button>
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

        {/* Calendrier */}
        {renderCalendar()}

        {/* Récapitulatif et actions */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Récapitulatif heures */}
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

              {/* Récapitulatif euros */}
              <Card className="border-2">
                <CardContent className="p-4">
                  <div className="flex items-end gap-4">
                    <div className="text-primary text-4xl font-bold">€</div>
                    <div className="text-3xl font-bold">
                      {(getTotalHours() * 15).toFixed(2)}€
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">Revenu du mois</div>
                </CardContent>
              </Card>

              {/* Bouton Générer facture */}
              <Button
                onClick={generateInvoice}
                variant="default"
                className="h-full gap-3"
              >
                <FileText size={24} />
                Générer la facture
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal d'édition */}
        <Dialog open={editingDay !== null} onOpenChange={(open) => !open && setEditingDay(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Modifier le {editingDay} {currentDate.toLocaleDateString('fr-FR', { month: 'long' })}
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
                <Label htmlFor="end-time">Heure de fin</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
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
                onClick={deleteTimeEntry}
                disabled={loading}
                className="gap-2"
              >
                <Trash2 size={16} />
                Supprimer
              </Button>
              <Button onClick={saveTimeEntry} disabled={loading}>
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal des demandes de modification */}
        <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Demandes de modification en attente</DialogTitle>
            </DialogHeader>

            {modificationRequests.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Aucune demande en attente
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {modificationRequests.map((request) => {
                  const date = new Date(request.date);
                  const hours = calculateHours(request.start_time, request.end_time);

                  return (
                    <Card key={request.id} className="border-2">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-lg mb-2">
                              {date.toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-muted-foreground" />
                                <span>
                                  {formatTime(request.start_time)} - {formatTime(request.end_time)}
                                </span>
                                <Badge variant="secondary">{hours.toFixed(2)}h</Badge>
                              </div>
                              {request.comment && (
                                <div className="text-muted-foreground italic mt-2">
                                  "{request.comment}"
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground mt-2">
                                Demandé le {new Date(request.created_at).toLocaleString('fr-FR')}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleRequestAction(request.id, 'approved')}
                              disabled={loading}
                              className="gap-1"
                            >
                              <Check size={16} />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRequestAction(request.id, 'rejected')}
                              disabled={loading}
                              className="gap-1"
                            >
                              <X size={16} />
                              Rejeter
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRequestsDialog(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
