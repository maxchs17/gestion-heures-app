'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, FileText, LogOut, AlertCircle, Trash2, Copy, Check, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/mode-toggle';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
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
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{ totalHours: string; totalAmount: string; monthName: string } | null>(null);
  const [ibanCopied, setIbanCopied] = useState(false);
  const [username, setUsername] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Récupérer le username depuis localStorage
    const storedUsername = localStorage.getItem('username') || '';
    setUsername(storedUsername);
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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = new Date(year, month, 1).getDay();
    // Convertir pour que lundi = 0, dimanche = 6
    return day === 0 ? 6 : day - 1;
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

  const copyIban = () => {
    navigator.clipboard.writeText('FR7640618803510004045462651');
    setIbanCopied(true);
    setTimeout(() => setIbanCopied(false), 2000);
    toast.success('IBAN copié dans le presse-papier');
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
        setInvoiceData({
          totalHours: result.data.totalHours,
          totalAmount: result.data.totalAmount,
          monthName: monthName,
        });
        setShowInvoiceDialog(true);
        toast.success(`Facture pour ${monthName} générée avec succès!`);
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
    const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

    const headers = dayNames.map(day => (
      <div key={day} className="text-center font-semibold text-muted-foreground p-1 md:p-2 text-xs md:text-sm">
        {day}
      </div>
    ));

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1 md:p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
      const entry = timeEntries[key];
      const hours = entry ? calculateHours(entry.start, entry.end) : 0;

      days.push(
        <div
          key={day}
          onClick={() => openRequestDialog(day)}
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

    const totalCells = firstDay + daysInMonth;
    const cellsNeeded = 42;
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
                  <p className="text-sm text-muted-foreground">Olivier</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <ModeToggle />
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
        <Card className="mt-4 md:mt-6">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              {/* Récapitulatif */}
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

              {/* Bouton Générer facture - Masqué pour Jade/Maud */}
              {username !== 'jade' && (
                <Button
                  onClick={generateInvoice}
                  variant="default"
                  className="h-full gap-2 md:gap-3 min-h-[80px]"
                  disabled={hasPendingRequests}
                >
                  <FileText size={20} />
                  <span className="text-sm md:text-base">Générer la facture</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal de demande de modification */}
        <Dialog open={editingDay !== null} onOpenChange={(open) => !open && setEditingDay(null)}>
          <DialogContent className="p-4 md:p-6 max-w-[calc(100vw-2rem)] md:max-w-lg">
            <DialogHeader className="space-y-1 md:space-y-2">
              <DialogTitle className="text-base md:text-lg">
                Demander une modification - {editingDay} {currentDate.toLocaleDateString('fr-FR', { month: 'long' })}
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

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="comment" className="text-sm">Commentaire (optionnel)</Label>
                <Input
                  id="comment"
                  type="text"
                  placeholder="Raison de la modification..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
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
                onClick={submitDeletionRequest}
                disabled={loading}
                className="gap-2 w-full sm:w-auto"
              >
                <Trash2 size={16} />
                Demander suppression
              </Button>
              <Button onClick={submitModificationRequest} disabled={loading} className="w-full sm:w-auto">
                {loading ? 'Envoi...' : 'Envoyer la demande'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation de facture */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="p-4 md:p-6 max-w-[calc(100vw-2rem)] sm:max-w-md">
            <DialogHeader className="space-y-1 md:space-y-2">
              <DialogTitle className="text-lg md:text-xl">Facture envoyée !</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 md:space-y-4 py-2 md:py-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check size={18} className="md:w-5 md:h-5" />
                <span className="font-medium text-sm md:text-base">La facture a été envoyée par email</span>
              </div>

              {invoiceData && (
                <div className="space-y-2 md:space-y-3 rounded-lg bg-muted p-3 md:p-4">
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">Période :</span>
                    <span className="font-medium">{invoiceData.monthName}</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">Total heures :</span>
                    <span className="font-medium">{invoiceData.totalHours}h</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-muted-foreground">Montant :</span>
                    <span className="font-semibold text-base md:text-lg">{invoiceData.totalAmount}€</span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium">IBAN pour le paiement</Label>
                <div className="flex gap-2">
                  <Input
                    value="FR76 4061 8803 5100 0404 5462 651"
                    readOnly
                    className="font-mono text-xs md:text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyIban}
                    className="shrink-0 h-9 w-9 md:h-10 md:w-10"
                  >
                    {ibanCopied ? <Check size={16} className="md:w-[18px] md:h-[18px]" /> : <Copy size={16} className="md:w-[18px] md:h-[18px]" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter className="mt-2 md:mt-4">
              <Button onClick={() => setShowInvoiceDialog(false)} className="w-full sm:w-auto">
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de changement de mot de passe */}
        <ChangePasswordDialog
          open={showChangePasswordDialog}
          onOpenChange={setShowChangePasswordDialog}
          username={username}
        />
      </div>
    </div>
  );
}
