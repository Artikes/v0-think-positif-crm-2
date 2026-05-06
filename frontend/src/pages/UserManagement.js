import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ROLES } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  User,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const UserManagement = () => {
  const { isAdmin, profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: ROLES.EMPLOYEE
  });

  useEffect(() => {
    if (isAdmin()) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedUser) {
        // Update existing user profile
        const { error } = await supabase
          .from('profiles')
          .update({
            name: formData.name,
            role: formData.role,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedUser.id);

        if (error) throw error;
        toast.success('Utilisateur mis à jour');
      }

      setShowAddDialog(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (id === profile?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur? Ses tâches et événements seront désassignés.')) return;

    try {
      // Nullify FK references one by one to avoid body stream conflicts
      await supabase.from('tasks').update({ assigned_to: null }).eq('assigned_to', id);
      await supabase.from('tasks').update({ created_by: null }).eq('created_by', id);
      await supabase.from('schedules').update({ user_id: null }).eq('user_id', id);
      await supabase.from('clients').update({ assigned_to: null }).eq('assigned_to', id);

      // Delete the profile row
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Utilisateur supprimé');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  const handleApprove = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approved: true, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Utilisateur validé');
      fetchUsers();
    } catch (error) {
      console.error('Error approving user:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const handleRevoke = async (userId) => {
    if (userId === profile?.id) {
      toast.error('Vous ne pouvez pas révoquer votre propre accès');
      return;
    }
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approved: false, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Accès révoqué');
      fetchUsers();
    } catch (error) {
      console.error('Error revoking user:', error);
      toast.error('Erreur lors de la révocation');
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || ROLES.EMPLOYEE
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      role: ROLES.EMPLOYEE
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesApproval = approvalFilter === 'all' || 
      (approvalFilter === 'approved' && user.approved === true) ||
      (approvalFilter === 'pending' && user.approved !== true);
    return matchesSearch && matchesRole && matchesApproval;
  });

  // Count pending approvals
  const pendingCount = users.filter(u => u.approved !== true).length;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (!isAdmin()) {
    return (
      <Layout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Accès restreint</h2>
              <p className="text-muted-foreground text-center">
                Cette page est réservée aux administrateurs.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="users-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Gestion des utilisateurs
            </h1>
            <p className="text-muted-foreground mt-1">
              Gérez les comptes et les permissions
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un utilisateur..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="user-search-input"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="user-role-filter">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value={ROLES.SUPERADMIN}>Super Admin</SelectItem>
                  <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                  <SelectItem value={ROLES.EMPLOYEE}>Employé</SelectItem>
                </SelectContent>
              </Select>
              <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="user-approval-filter">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="approved">Validés</SelectItem>
                  <SelectItem value="pending">
                    En attente {pendingCount > 0 && `(${pendingCount})`}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="hidden md:table-cell">Créé le</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">Aucun utilisateur trouvé</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          {user.name || 'Sans nom'}
                          {user.id === profile?.id && (
                            <Badge variant="outline" className="text-xs">Vous</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{user.email || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.role === ROLES.SUPERADMIN ? 'destructive' : user.role === ROLES.ADMIN ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {user.role === ROLES.SUPERADMIN ? (
                            <><Shield className="h-3 w-3 mr-1" /> Super Admin</>
                          ) : user.role === ROLES.ADMIN ? (
                            <><Shield className="h-3 w-3 mr-1" /> Admin</>
                          ) : (
                            <><User className="h-3 w-3 mr-1" /> Employé</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.approved ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" /> Validé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-500 border-orange-500">
                            <Clock className="h-3 w-3 mr-1" /> En attente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!user.approved ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600 hover:text-green-700 hover:bg-green-100"
                              onClick={() => handleApprove(user.id)}
                              title="Valider l'accès"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          ) : user.id !== profile?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-orange-500 hover:text-orange-600 hover:bg-orange-100"
                              onClick={() => handleRevoke(user.id)}
                              title="Révoquer l'accès"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`user-actions-${user.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              {user.id !== profile?.id && (
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleDelete(user.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'utilisateur
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="user-name-input"
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
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  disabled={selectedUser?.id === profile?.id}
                >
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ROLES.SUPERADMIN}>Super Admin</SelectItem>
                    <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
                    <SelectItem value={ROLES.EMPLOYEE}>Employé</SelectItem>
                  </SelectContent>
                </Select>
                {selectedUser?.id === profile?.id && (
                  <p className="text-xs text-muted-foreground">
                    Vous ne pouvez pas modifier votre propre rôle
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="user-submit-btn">
                  Mettre à jour
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default UserManagement;
