'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, FileText, LogOut, Bell, Check, X, Trash2, KeyRound, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/mode-toggle';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { GenerateInvoiceDialog } from '@/components/generate-invoice-dialog';
import { SettingsDialog } from '@/components/settings-dialog';
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
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
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

  // Obtenir le premier jour du mois (0 = lundi, 6 = dimanche)
  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = new Date(year, month, 1).getDay();
    // Convertir pour que lundi = 0, dimanche = 6
    return day === 0 ? 6 : day - 1;
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

  // Calculer le total d'heures du mois affiché
  const getTotalHours = () => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    return Object.entries(timeEntries).reduce((total, [key, entry]) => {
      const [year, month] = key.split('-').map(Number);
      // Ne compter que les entrées du mois affiché
      if (year === currentYear && month === currentMonth) {
        return total + calculateHours(entry.start, entry.end);
      }
      return total;
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

  // Ouvrir le dialog de génération de facture
  const openInvoiceDialog = () => {
    setShowInvoiceDialog(true);
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
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    // En-têtes des jours
    const headers = dayNames.map(day => (
      <div key={day} className="text-center font-semibold text-muted-foreground p-1 md:p-2 text-xs md:text-sm">
        {day}
      </div>
    ));

    // Cellules vides pour aligner le premier jour
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1 md:p-2"></div>);
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
          className="border border-border p-1 md:p-2 min-h-14 md:min-h-20 cursor-pointer hover:bg-accent transition-colors rounded-sm md:rounded-md"
        >
          <div className="font-semibold text-foreground text-xs md:text-base">{day}</div>
          {entry && (
            <div className="text-[10px] md:text-xs mt-0.5 md:mt-1">
              <div className="text-muted-foreground hidden sm:block">
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
      days.push(<div key={`empty-end-${i}`} className="p-1 md:p-2 min-h-14 md:min-h-20"></div>);
    }

    return (
      <Card>
        <CardHeader className="pb-3 md:pb-4 p-3 md:p-6">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => changeMonth(-1)}
              size="sm"
              className="px-2 md:px-4"
            >
              <span className="hidden sm:inline">← Précédent</span>
              <span className="sm:hidden">←</span>
            </Button>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-center flex-1">
              {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </h2>
            <Button
              variant="outline"
              onClick={() => changeMonth(1)}
              size="sm"
              className="px-2 md:px-4"
            >
              <span className="hidden sm:inline">Suivant →</span>
              <span className="sm:hidden">→</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-4">
          <div className="grid grid-cols-7 gap-0.5 md:gap-1">
            {headers}
            {days}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-6xl w-full">
        {/* En-tête */}
        <Card className="mb-4 md:mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="text-primary" size={28} />
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold">Gestion des Heures</h1>
                  <p className="text-sm text-muted-foreground">Maxence</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto flex-wrap">
                <ModeToggle />
                <Button
                  variant="outline"
                  onClick={() => setShowRequestsDialog(true)}
                  className="gap-2 relative flex-1 sm:flex-initial"
                >
                  <Bell size={18} />
                  <span className="hidden sm:inline">Demandes</span>
                  {modificationRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {modificationRequests.length}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowChangePasswordDialog(true)}
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <KeyRound size={18} />
                  <span className="hidden sm:inline">Mot de passe</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowSettingsDialog(true)}
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <Settings size={18} />
                  <span className="hidden sm:inline">Paramètres</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="gap-2 flex-1 sm:flex-initial"
                >
                  <LogOut size={18} />
                  <span className="sm:inline">Déconnexion</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendrier */}
        {renderCalendar()}

        {/* Récapitulatif et actions */}
        <Card className="mt-4 md:mt-6">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
              {/* Récapitulatif heures */}
              <Card className="border-2">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-end gap-3 md:gap-4">
                    <Clock className="text-primary" size={32} />
                    <div className="text-2xl md:text-3xl font-bold text-primary">
                      {getTotalHours().toFixed(2)}h
                    </div>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-2">Total du mois</div>
                </CardContent>
              </Card>

              {/* Récapitulatif euros */}
              <Card className="border-2">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-end gap-3 md:gap-4">
                    <div className="text-primary text-3xl md:text-4xl font-bold">€</div>
                    <div className="text-2xl md:text-3xl font-bold">
                      {(getTotalHours() * 15).toFixed(2)}€
                    </div>
                  </div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-2">Revenu du mois</div>
                </CardContent>
              </Card>

              {/* Bouton Générer facture */}
              <Button
                onClick={openInvoiceDialog}
                variant="default"
                className="h-full gap-2 md:gap-3 min-h-[80px]"
              >
                <FileText size={20} />
                <span className="text-sm md:text-base">Générer la facture</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal d'édition */}
        <Dialog open={editingDay !== null} onOpenChange={(open) => !open && setEditingDay(null)}>
          <DialogContent className="p-4 md:p-6 max-w-[calc(100vw-2rem)] md:max-w-lg">
            <DialogHeader className="space-y-1 md:space-y-2">
              <DialogTitle className="text-base md:text-lg">
                Modifier le {editingDay} {currentDate.toLocaleDateString('fr-FR', { month: 'long' })}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 md:space-y-6 pt-2 md:pt-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="start-time" className="text-sm">Heure de début</Label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="text-sm md:text-base"
                />
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="end-time" className="text-sm">Heure de fin</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="text-sm md:text-base"
                />
              </div>

              <div className="flex items-center justify-between p-2 md:p-3 bg-muted rounded-lg">
                <span className="text-xs md:text-sm font-medium text-muted-foreground">Durée totale</span>
                <span className="text-base md:text-lg font-bold text-primary">
                  {calculateHours(startTime, endTime).toFixed(2)}h
                </span>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 mt-4">
              <Button
                variant="destructive"
                onClick={deleteTimeEntry}
                disabled={loading}
                className="gap-2 w-full sm:w-auto"
              >
                <Trash2 size={16} />
                Supprimer
              </Button>
              <Button onClick={saveTimeEntry} disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal des demandes de modification */}
        <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
          <DialogContent className="p-4 md:p-6 max-w-[calc(100vw-2rem)] md:max-w-2xl max-h-[85vh] md:max-h-[80vh] overflow-y-auto">
            <DialogHeader className="space-y-1 md:space-y-2">
              <DialogTitle className="text-base md:text-lg">Demandes de modification en attente</DialogTitle>
            </DialogHeader>

            {modificationRequests.length === 0 ? (
              <div className="py-6 md:py-8 text-center text-muted-foreground text-sm md:text-base">
                Aucune demande en attente
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4 pt-2 md:pt-4">
                {modificationRequests.map((request) => {
                  const date = new Date(request.date);
                  const hours = calculateHours(request.start_time, request.end_time);

                  return (
                    <Card key={request.id} className="border-2">
                      <CardContent className="p-3 md:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-semibold text-sm md:text-lg mb-1.5 md:mb-2">
                              {date.toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="space-y-1 text-xs md:text-sm">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="md:w-4 md:h-4 text-muted-foreground" />
                                <span>
                                  {formatTime(request.start_time)} - {formatTime(request.end_time)}
                                </span>
                                <Badge variant="secondary" className="text-xs">{hours.toFixed(2)}h</Badge>
                              </div>
                              {request.comment && (
                                <div className="text-muted-foreground italic mt-1.5 md:mt-2 text-xs md:text-sm">
                                  "{request.comment}"
                                </div>
                              )}
                              <div className="text-[10px] md:text-xs text-muted-foreground mt-1.5 md:mt-2">
                                Demandé le {new Date(request.created_at).toLocaleString('fr-FR')}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleRequestAction(request.id, 'approved')}
                              disabled={loading}
                              className="gap-1 flex-1 sm:flex-initial text-xs md:text-sm"
                            >
                              <Check size={14} className="md:w-4 md:h-4" />
                              Approuver
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRequestAction(request.id, 'rejected')}
                              disabled={loading}
                              className="gap-1 flex-1 sm:flex-initial text-xs md:text-sm"
                            >
                              <X size={14} className="md:w-4 md:h-4" />
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

            <DialogFooter className="mt-3 md:mt-4">
              <Button variant="outline" onClick={() => setShowRequestsDialog(false)} className="w-full sm:w-auto">
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de changement de mot de passe */}
        <ChangePasswordDialog
          open={showChangePasswordDialog}
          onOpenChange={setShowChangePasswordDialog}
          username="admin"
        />

        {/* Dialog de génération de facture */}
        <GenerateInvoiceDialog
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          currentDate={currentDate}
        />

        {/* Dialog de paramètres */}
        <SettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
        />
      </div>
    </div>
  );
}
