import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Users,
  Mail,
  Linkedin,
  Trash2,
  Edit,
  Camera,
  Briefcase,
  ImageIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

const Trombinoscope = () => {
  const { isAdmin } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    photo_url: '',
    banner_url: '',
    email: '',
    linkedin_url: ''
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedMember) {
        const { error } = await supabase
          .from('team_members')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedMember.id);

        if (error) throw error;
        toast.success('Membre mis à jour');
      } else {
        const { error } = await supabase
          .from('team_members')
          .insert([{
            ...formData,
            sort_order: teamMembers.length
          }]);

        if (error) throw error;
        toast.success('Membre ajouté');
      }

      setShowAddDialog(false);
      resetForm();
      fetchTeamMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce membre de l\'équipe?')) return;
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Membre supprimé');
      fetchTeamMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditDialog = (member) => {
    setSelectedMember(member);
    setFormData({
      name: member.name,
      domain: member.domain,
      photo_url: member.photo_url || '',
      banner_url: member.banner_url || '',
      email: member.email || '',
      linkedin_url: member.linkedin_url || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setSelectedMember(null);
    setFormData({
      name: '',
      domain: '',
      photo_url: '',
      banner_url: '',
      email: '',
      linkedin_url: ''
    });
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredMembers = teamMembers.filter(member =>
    member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.domain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Color palette for avatar backgrounds
  const getAvatarColor = (index) => {
    const colors = [
      'bg-gradient-to-br from-violet-500 to-purple-600',
      'bg-gradient-to-br from-blue-500 to-cyan-600',
      'bg-gradient-to-br from-emerald-500 to-teal-600',
      'bg-gradient-to-br from-orange-500 to-amber-600',
      'bg-gradient-to-br from-pink-500 to-rose-600',
      'bg-gradient-to-br from-indigo-500 to-blue-600',
    ];
    return colors[index % colors.length];
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Trombinoscope
            </h1>
            <p className="text-muted-foreground mt-1">Notre équipe</p>
          </div>
          {isAdmin && (
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un membre
            </Button>
          )}
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou domaine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Team Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'Aucun membre trouvé' : 'Aucun membre dans l\'équipe'}
              </p>
              {isAdmin && !searchQuery && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => { resetForm(); setShowAddDialog(true); }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter le premier membre
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMembers.map((member, index) => (
              <Card 
                key={member.id} 
                className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                {/* Background banner */}
                {member.banner_url ? (
                  <div 
                    className="absolute inset-x-0 top-0 h-24 bg-cover bg-center"
                    style={{ backgroundImage: `url(${member.banner_url})` }}
                  />
                ) : (
                  <div className={`absolute inset-x-0 top-0 h-24 ${getAvatarColor(index)} opacity-90`} />
                )}
                
                {/* Admin actions */}
                {isAdmin && (
                  <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8 bg-white/90 hover:bg-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(member)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(member.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                <CardContent className="pt-16 pb-6 px-6 text-center relative">
                  {/* Avatar */}
                  <Avatar className="h-24 w-24 mx-auto -mt-12 ring-4 ring-background shadow-xl">
                    {member.photo_url ? (
                      <AvatarImage src={member.photo_url} alt={member.name} className="object-cover" />
                    ) : null}
                    <AvatarFallback className={`text-xl font-bold text-white ${getAvatarColor(index)}`}>
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <h3 className="font-semibold text-lg mt-4">{member.name}</h3>
                  <div className="flex items-center justify-center gap-1.5 text-muted-foreground mt-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span className="text-sm">{member.domain}</span>
                  </div>

                  {/* Links */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {member.email && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full hover:bg-primary/10 hover:text-primary"
                        onClick={() => window.location.href = `mailto:${member.email}`}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    {member.linkedin_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full hover:bg-blue-500/10 hover:text-blue-600"
                        onClick={() => window.open(member.linkedin_url, '_blank')}
                      >
                        <Linkedin className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowAddDialog(open); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {selectedMember ? 'Modifier le membre' : 'Nouveau membre'}
              </DialogTitle>
              <DialogDescription>
                {selectedMember ? 'Modifiez les informations du membre' : 'Ajoutez un nouveau membre à l\'équipe'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Banner URL */}
              <div className="space-y-2">
                <Label htmlFor="banner_url">Bannière (URL)</Label>
                <div className="flex gap-3 items-center">
                  <div className="h-12 w-20 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                    {formData.banner_url ? (
                      <img src={formData.banner_url} alt="Banner preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <Input
                    id="banner_url"
                    value={formData.banner_url}
                    onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Photo URL */}
              <div className="space-y-2">
                <Label htmlFor="photo_url">Photo (URL)</Label>
                <div className="flex gap-3 items-center">
                  <Avatar className="h-16 w-16">
                    {formData.photo_url ? (
                      <AvatarImage src={formData.photo_url} alt="Preview" className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                      <Camera className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    id="photo_url"
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    placeholder="https://..."
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Jean Dupont"
                  required
                />
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <Label htmlFor="domain">Domaine / Fonction *</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="Développeur, Designer, Marketing..."
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jean@example.com"
                />
              </div>

              {/* LinkedIn */}
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn (URL)</Label>
                <Input
                  id="linkedin_url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  {selectedMember ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Trombinoscope;
