import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Moon,
  Sun,
  Shield,
  Save,
  Loader2,
  Database,
  HardDrive,
  Key
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const Settings = () => {
  const { profile, refreshProfile, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || ''
  });

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      await refreshProfile();
      toast.success('Profil mis à jour');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="settings-page">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Paramètres
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos préférences et votre profil
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Settings - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profil
              </CardTitle>
              <CardDescription>
                Gérez vos informations personnelles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="settings-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Rôle</Label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium capitalize">{profile?.role || 'employee'}</span>
                </div>
              </div>

              <Button 
                onClick={handleSaveProfile} 
                disabled={loading}
                data-testid="save-profile-btn"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </CardContent>
          </Card>

          {/* Right Column - Stacked Cards */}
          <div className="space-y-6">
            {/* Appearance */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  Apparence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Mode sombre</Label>
                    <p className="text-xs text-muted-foreground">
                      {theme === 'dark' ? 'Activé' : 'Désactivé'}
                    </p>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={toggleTheme}
                    data-testid="dark-mode-switch"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-xs text-muted-foreground">
                      Recevoir des notifications par email
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="email-notifications-switch" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Rappels</Label>
                    <p className="text-xs text-muted-foreground">
                      Rappels de suivi
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="reminder-notifications-switch" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Admin Settings */}
        {isAdmin() && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Paramètres administrateur
              </CardTitle>
              <CardDescription>
                Configuration avancée du système
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium">Base de données</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Supabase PostgreSQL</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium">Stockage</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Supabase Storage</p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-orange-500" />
                    <h4 className="font-medium">Authentification</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">Supabase Auth</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Settings;
