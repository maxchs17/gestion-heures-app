'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface GenerateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
}

export function GenerateInvoiceDialog({ open, onOpenChange, currentDate }: GenerateInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  // Charger l'email par défaut depuis les settings
  useEffect(() => {
    const loadDefaultEmail = async () => {
      try {
        const response = await fetch('/api/settings');
        const result = await response.json();

        if (result.success && result.data) {
          setEmail(result.data.invoice_email || 'Obaradise78@gmail.com');
        } else {
          setEmail('Obaradise78@gmail.com');
        }
      } catch (error) {
        console.error('Erreur chargement email:', error);
        setEmail('Obaradise78@gmail.com');
      }
    };

    if (open) {
      loadDefaultEmail();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast.error('Veuillez entrer une adresse email valide');
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
        body: JSON.stringify({ year, month, email }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Facture pour ${monthName} générée et envoyée à ${email}! Total: ${result.data.totalHours}h - ${result.data.totalAmount}€`);
        onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Générer la facture</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="month">Mois</Label>
              <Input
                id="month"
                value={currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email de destination</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@email.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                La facture sera envoyée à cette adresse
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Génération...' : 'Générer et envoyer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
