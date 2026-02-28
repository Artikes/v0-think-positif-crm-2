import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'think-positif-crm-auth',
  }
});

export const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee'
};

export const TALENT_STATUS = {
  ACTIVE: { label: 'Actif', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  FOLLOW_UP: { label: 'Suivi', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  INACTIVE: { label: 'Inactif', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  HIGH_POTENTIAL: { label: 'Haut potentiel', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
};

export const EXPERTISE_CATEGORIES = [
  {
    id: 'cultural',
    name: 'Industries Culturelles & Créatives',
    subcategories: ['Musique', 'Arts', 'Design', 'Médias', 'Diversité']
  },
  {
    id: 'sport',
    name: 'Sport & Performance Durable',
    subcategories: ['Innovation', 'Santé', 'Inclusion', 'Bien-être']
  },
  {
    id: 'industry',
    name: 'Industrie du Futur',
    subcategories: ['Industrie résiliente', 'Économie circulaire', 'Production intelligente']
  },
  {
    id: 'resources',
    name: 'Gestion des Ressources',
    subcategories: ['Eau', 'Énergie', 'Biodiversité', 'Anti-gaspillage']
  },
  {
    id: 'luxury',
    name: 'Luxe & Tourisme Responsable',
    subcategories: ['Luxe durable', 'Tourisme éthique']
  },
  {
    id: 'agritech',
    name: 'AgriTech',
    subcategories: ['Agriculture connectée', 'Souveraineté alimentaire']
  }
];
