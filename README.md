# TalentCRM - Plateforme de Gestion de Talents et CRM

Une plateforme SaaS moderne pour gérer vos formateurs, talents et clients avec une interface intuitive en français.

## 🚀 Fonctionnalités

### Module CRM
- Gestion des clients (entreprises, contacts, notes)
- Timeline d'activités
- Suivi du chiffre d'affaires (Admin uniquement)
- Filtres et recherche avancée

### Gestion des Formateurs
- Profils complets avec expertises
- Multi-sélection des domaines d'expertise
- Gestion des diplômes
- Upload de documents (CV, administratif)

### Jeunes Potentiels
- Suivi avec statuts colorés (Actif, Suivi, Inactif, Haut Potentiel)
- Gestion des intérêts et aspirations
- Attribution aux employés

### Thèmes d'Expertise
- Industries Culturelles & Créatives
- Sport & Performance Durable
- Industrie du Futur
- Gestion des Ressources
- Luxe & Tourisme Responsable
- AgriTech

### Gestion Documentaire
- Upload sécurisé via Supabase Storage
- Prévisualisation et téléchargement
- Organisation par entité

### Dashboards
- **Admin**: Analytics complets, revenus, charts, recommandations
- **Employé**: Tâches assignées, suivi des profils

## 🔐 Authentification & Rôles

- **Supabase Auth** avec email/mot de passe et Google OAuth
- **Admin**: Accès complet à tous les modules
- **Employé**: Accès limité (lecture CRM, édition profils assignés)

## 🛠️ Configuration Supabase

### 1. Créer les tables

Copiez le contenu de `/app/supabase-schema.sql` et exécutez-le dans:
**Supabase Dashboard > SQL Editor**

### 2. Activer Google OAuth (optionnel)

1. Allez dans **Supabase Dashboard > Authentication > Providers**
2. Activez Google
3. Configurez les credentials Google OAuth

### 3. Configurer les URLs de redirection

1. Allez dans **Authentication > URL Configuration**
2. Ajoutez votre URL de production dans les Redirect URLs

### 4. Créer un utilisateur Admin

1. Inscrivez-vous via l'interface
2. Dans Supabase Dashboard > Table Editor > profiles
3. Modifiez le rôle de votre utilisateur en `admin`

### 5. Créer le bucket Storage

Le SQL crée automatiquement le bucket `documents`. Si ce n'est pas le cas:
1. Allez dans **Storage** 
2. Créez un bucket nommé `documents`

## 🏗️ Structure du Projet

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── ProtectedRoute.js
│   │   ├── layout/
│   │   │   ├── Layout.js
│   │   │   └── Sidebar.js
│   │   └── ui/         # Composants Shadcn
│   ├── contexts/
│   │   ├── AuthContext.js
│   │   └── ThemeContext.js
│   ├── lib/
│   │   └── supabase.js
│   └── pages/
│       ├── Login.js
│       ├── Register.js
│       ├── Dashboard.js
│       ├── Clients.js
│       ├── Trainers.js
│       ├── Talents.js
│       ├── Documents.js
│       ├── UserManagement.js
│       ├── Expertise.js
│       └── Settings.js
```

## 🔑 Variables d'Environnement

### Frontend (.env)
```
REACT_APP_SUPABASE_URL=votre_url_supabase
REACT_APP_SUPABASE_ANON_KEY=votre_anon_key
```

## 📊 Schéma de Base de Données

| Table | Description |
|-------|-------------|
| profiles | Profils utilisateurs liés à auth.users |
| clients | Clients CRM |
| trainers | Formateurs |
| talents | Jeunes potentiels |
| expertise_categories | Catégories d'expertise |
| documents | Métadonnées des documents |
| activities | Timeline des activités |
| recommendations | Suggestions système |

## 🎨 Design

- **Couleurs**: Gris foncé, blanc, bleu électrique
- **Polices**: Plus Jakarta Sans (titres), Inter (corps)
- **Mode**: Clair/Sombre avec toggle
- **Framework UI**: Shadcn/UI + TailwindCSS

## 🔒 Sécurité (RLS)

Les politiques Row Level Security sont implémentées pour:
- Admin: Accès CRUD complet
- Employé: Lecture partagée, écriture limitée aux assignations
- Suppression: Réservée aux admins

## 📝 Prochaines Étapes

1. Exécuter le SQL dans Supabase
2. Configurer Google OAuth si nécessaire
3. Créer le premier utilisateur admin
4. Tester les fonctionnalités

## 🤝 Support

Pour toute question, consultez la documentation Supabase:
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
