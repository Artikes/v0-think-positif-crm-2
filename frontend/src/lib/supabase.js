import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  console.error('Missing Supabase environment variables. Auth will not work.');
}

// Always create the client (even with empty strings) so imports never get null.
// Supabase client with empty URL will simply fail API calls gracefully.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      // Do NOT set a custom storageKey - use Supabase's default so existing
      // sessions from the original Emergent AI deployment are preserved on refresh.
    }
  }
);

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

// Default expertise categories (fallback)
export const DEFAULT_EXPERTISE_CATEGORIES = [
  {
    id: 'cultural',
    name: 'Industries Culturelles & Créatives',
    subcategories: ['Musique', 'Arts', 'Design', 'Médias', 'Diversité'],
    icon: 'Palette',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  },
  {
    id: 'sport',
    name: 'Sport & Performance Durable',
    subcategories: ['Innovation', 'Santé', 'Inclusion', 'Bien-être'],
    icon: 'Activity',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  },
  {
    id: 'industry',
    name: 'Industrie du Futur',
    subcategories: ['Industrie résiliente', 'Économie circulaire', 'Production intelligente'],
    icon: 'Factory',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  },
  {
    id: 'resources',
    name: 'Gestion des Ressources',
    subcategories: ['Eau', 'Énergie', 'Biodiversité', 'Anti-gaspillage'],
    icon: 'Leaf',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
  },
  {
    id: 'luxury',
    name: 'Luxe & Tourisme Responsable',
    subcategories: ['Luxe durable', 'Tourisme éthique'],
    icon: 'Sparkles',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  },
  {
    id: 'agritech',
    name: 'AgriTech',
    subcategories: ['Agriculture connectée', 'Souveraineté alimentaire'],
    icon: 'Wheat',
    color: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400'
  }
];

// For backward compatibility
export const EXPERTISE_CATEGORIES = DEFAULT_EXPERTISE_CATEGORIES;

// Function to fetch expertise categories from database
export const fetchExpertiseCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('expertise_categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      return data.map(cat => ({
        id: cat.id,
        name: cat.name,
        subcategories: cat.subcategories || [],
        icon: cat.icon || 'Tags',
        color: cat.color || 'bg-gray-100 text-gray-700',
        image_url: cat.image_url || '',
        sort_order: cat.sort_order || 0
      }));
    }
    return DEFAULT_EXPERTISE_CATEGORIES;
  } catch (error) {
    console.error('Error fetching expertise categories:', error);
    return DEFAULT_EXPERTISE_CATEGORIES;
  }
};

// CRUD operations for expertise categories
export const createExpertiseCategory = async (category) => {
  const { data, error } = await supabase
    .from('expertise_categories')
    .insert([{
      id: category.id,
      name: category.name,
      subcategories: category.subcategories || [],
      icon: category.icon || 'Tags',
      color: category.color || 'bg-gray-100 text-gray-700',
      image_url: category.image_url || '',
      sort_order: category.sort_order || 0
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateExpertiseCategory = async (id, updates) => {
  const { data, error } = await supabase
    .from('expertise_categories')
    .update({
      name: updates.name,
      subcategories: updates.subcategories,
      icon: updates.icon,
      color: updates.color,
      image_url: updates.image_url,
      sort_order: updates.sort_order,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteExpertiseCategory = async (id) => {
  const { error } = await supabase
    .from('expertise_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// Schools CRUD operations
export const fetchSchools = async () => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching schools:', error);
    return [];
  }
};

export const createSchool = async (school) => {
  const { data, error } = await supabase
    .from('schools')
    .insert([{
      name: school.name,
      location: school.location || '',
      website: school.website || '',
      color: school.color || 'bg-blue-100 text-blue-700'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateSchool = async (id, updates) => {
  const { data, error } = await supabase
    .from('schools')
    .update({
      name: updates.name,
      location: updates.location,
      website: updates.website,
      color: updates.color,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteSchool = async (id) => {
  const { error } = await supabase
    .from('schools')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};
