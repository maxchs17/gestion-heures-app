-- Créer la table users pour gérer l'authentification
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances de recherche par username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insérer les utilisateurs par défaut avec des mots de passe hashés
-- Les mots de passe sont: admin123 et client123
-- Hash généré avec bcrypt (salt rounds: 10)
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2b$10$UjBuNC62NYLhSpJFWibZSuLE0OGDRWXF9OmU9EFY5e7G9kTdPerl.', 'admin'),
  ('client', '$2b$10$WwOdAY7Qxqq4gzGUbauG7e2.GsYEf1n9o5TytJInAYkuK.Qz6N5DK', 'client')
ON CONFLICT (username) DO NOTHING;
