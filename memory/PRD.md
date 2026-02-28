# TalentCRM - Product Requirements Document

## Original Problem Statement
Build a production-ready CRM and Talent Management Platform using Supabase as the backend infrastructure with:
- CRM Module for client management
- Trainers (Formateurs) management with expertise taxonomy
- Young Talents (Jeunes Potentiels) with color-coded status
- Expertise Themes Taxonomy
- Document Management with Supabase Storage
- Role-based dashboards (Admin vs Employee)
- Recommendation Engine with rule-based suggestions
- French language UI

## User Choices
- Supabase URL: https://tykxjwzbvpfnllrdgokk.supabase.co
- Authentication: Email/Password + Google OAuth
- Language: French
- AI Recommendations: Rule-based logic
- Theme: Dark grey/white with blue accents, both dark/light modes

## User Personas
1. **Admin**: Full access to all modules, user management, analytics, revenue tracking
2. **Employee**: Limited access, can view CRM clients, edit assigned profiles only

## Core Requirements
- [x] Supabase Auth integration
- [x] Role-based access control (Admin/Employee)
- [x] French language interface
- [x] Dark/Light theme toggle
- [x] Responsive SaaS dashboard layout

## What's Been Implemented (Feb 28, 2026)

### Authentication & Authorization
- [x] Login page with email/password
- [x] Registration page
- [x] Google OAuth button (ready for Supabase configuration)
- [x] Protected routes
- [x] Role-based navigation

### Pages Implemented
- [x] Login/Register with French UI
- [x] Dashboard with KPIs, charts, recommendations
- [x] CRM Clients (CRUD, timeline, filters)
- [x] Trainers (CRUD, expertise selection, documents)
- [x] Talents (CRUD, status colors, assignment)
- [x] Documents (upload, preview, download)
- [x] User Management (Admin only)
- [x] Expertise Categories display
- [x] Settings page

### Database Schema
- [x] SQL schema created: `/app/supabase-schema.sql`
- [x] Tables: profiles, clients, trainers, talents, expertise_categories, documents, activities, recommendations
- [x] RLS policies defined for Admin/Employee roles
- [x] Storage bucket configuration

### UI/UX
- [x] Plus Jakarta Sans + Inter fonts
- [x] Dark grey/white/blue color scheme
- [x] Theme toggle on all pages
- [x] Responsive sidebar navigation
- [x] Shadcn/UI components
- [x] French localization

## Prioritized Backlog

### P0 (Critical)
- [ ] Execute SQL schema in Supabase Dashboard
- [ ] Create first admin user
- [ ] Enable Google OAuth in Supabase

### P1 (Important)
- [ ] Implement recommendation engine logic
- [ ] Add real-time updates with Supabase subscriptions
- [ ] Email notifications for follow-ups

### P2 (Nice to Have)
- [ ] Export data to CSV/Excel
- [ ] Advanced reporting dashboard
- [ ] Batch import of trainers/talents
- [ ] Mobile app version

## Next Tasks
1. User must run SQL schema in Supabase Dashboard
2. Create admin user and set role
3. Test full CRUD operations with real data
4. Configure Google OAuth if needed
5. Add more recommendation rules
