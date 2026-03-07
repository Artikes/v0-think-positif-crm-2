import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

export default function PendingApproval() {
  const { logout, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      // If approved now, redirect to dashboard
      if (profile?.approved) {
        navigate('/');
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Compte en attente de validation</CardTitle>
          <CardDescription className="mt-2">
            Votre compte a été créé avec succès. Un administrateur doit valider votre accès avant que vous puissiez utiliser l'application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            <p><strong>Email:</strong> {profile?.email}</p>
            <p><strong>Nom:</strong> {profile?.name || 'Non renseigné'}</p>
            <p className="mt-2">
              Vous recevrez un email de confirmation une fois votre compte validé. En attendant, vous pouvez vérifier le statut de votre demande en cliquant sur le bouton ci-dessous.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Vérification...' : 'Vérifier le statut'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="w-full"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
