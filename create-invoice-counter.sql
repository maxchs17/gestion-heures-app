-- Créer la table pour le compteur de factures
CREATE TABLE IF NOT EXISTS invoice_counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_number INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer la valeur initiale
INSERT INTO invoice_counter (id, current_number) 
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;
