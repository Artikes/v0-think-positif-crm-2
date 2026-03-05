import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, TALENT_STATUS, EXPERTISE_CATEGORIES } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
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
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Star,
  Mail,
  Phone,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  Target,
  Lightbulb,
  Upload,
  FileText,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import ExportImportButtons from '../components/ExportImportButtons';

const DOCUMENT_CATEGORIES = [
  { value: 'cv', label: 'CV' },
  { value: 'identity', label: "Carte d'identit\u00e9" },
  { value: 'diploma', label: 'Dipl\u00f4me' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'contract', label: 'Contrat' },
  { value: 'recommendation', label: 'Lettre de recommandation' },
  { value: 'other', label: 'Autre' },
];

const Talents = () => {
  const { isAdmin, profile } = useAuth();
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTalent, setSelectedTalent] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
    status: 'active',
    interests: '',
    aspirations: '',
    expertise: [],
    assigned_to: ''
  });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchTalents();
  }, []);

  const fetchTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTalents(data || []);
    } catch (error) {
      console.error('Error fetching talents:', error);
      toast.error('Erreur lors du chargement des talents');
    } finally {
      setLoading(false);
    }
  };

  const uploadFilesForEntity = async (entityId, entityType) => {
    if (pendingFiles.length === 0) return;
    for (const pf of pendingFiles) {
      const file = pf.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${entityType}/${entityId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      await supabase.from('documents').insert([{
        entity_type: entityType,
        entity_id: entityId,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        document_category: pf.category
      }]);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.map(f => ({ file: f, category: 'other' }));
    setPendingFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removePendingFile = (index) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileCategory = (index, category) => {
    setPendingFiles(prev => prev.map((pf, i) => i === index ? { ...pf, category } : pf));
  };

  const fetchTalentDocuments = async (talentId) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'talent')
        .eq('entity_id', talentId);
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        birth_date: formData.birth_date || null,
        status: formData.status,
        interests: formData.interests || null,
        aspirations: formData.aspirations || null,
        expertise: formData.expertise || [],
        assigned_to: formData.assigned_to || null
      };

      let talentId = selectedTalent?.id;

      if (selectedTalent) {
        const { error } = await supabase
          .from('talents')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', selectedTalent.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('talents')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        talentId = data.id;
      }

      // Upload pending files
      if (talentId && pendingFiles.length > 0) {
        await uploadFilesForEntity(talentId, 'talent');
      }

      toast.success(selectedTalent ? 'Talent mis à jour' : 'Talent ajouté');
      setShowAddDialog(false);
      resetForm();
      fetchTalents();
    } catch (error) {
      console.error('Error saving talent:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce talent?')) return;
    try {
      const { error } = await supabase.from('talents').delete().eq('id', id);
      if (error) throw error;
      toast.success('Talent supprimé');
      fetchTalents();
    } catch (error) {
      console.error('Error deleting talent:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleExpertiseChange = (categoryId, checked) => {
    if (checked) {
      setFormData({ ...formData, expertise: [...formData.expertise, categoryId] });
    } else {
      setFormData({ ...formData, expertise: formData.expertise.filter(e => e !== categoryId) });
    }
  };

  const openEditDialog = (talent) => {
    setSelectedTalent(talent);
    setFormData({
      first_name: talent.first_name,
      last_name: talent.last_name,
      email: talent.email || '',
      phone: talent.phone || '',
      birth_date: talent.birth_date || '',
      status: talent.status || 'active',
      interests: talent.interests || '',
      aspirations: talent.aspirations || '',
      expertise: talent.expertise || [],
      assigned_to: talent.assigned_to || ''
    });
    setShowAddDialog(true);
  };

  const openDetailDialog = async (talent) => {
    setSelectedTalent(talent);
    await fetchTalentDocuments(talent.id);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedTalent(null);
    setPendingFiles([]);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      birth_date: '',
      status: 'active',
      interests: '',
      aspirations: '',
      expertise: [],
      assigned_to: ''
    });
  };

  const canEdit = (talent) => {
    if (isAdmin()) return true;
    return talent.assigned_to === profile?.id;
  };

  const filteredTalents = talents.filter(talent => {
    const fullName = `${talent.first_name} ${talent.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || talent.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || talent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getExpertiseShort = (id) => {
    const labels = { 'cultural': 'Culture', 'sport': 'Sport', 'industry': 'Industrie', 'resources': 'Ressources', 'luxury': 'Luxe', 'agritech': 'AgriTech' };
    return labels[id] || id;
  };

  const getExpertiseLabel = (id) => {
    const category = EXPERTISE_CATEGORIES.find(c => c.id === id);
    return category?.name || id;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getStatusConfig = (status) => {
    const config = {
      active: { label: 'Actif', color: 'bg-green-500', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      follow_up: { label: 'Suivi', color: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
      inactive: { label: 'Inactif', color: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
      high_potential: { label: 'Haut potentiel', color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' }
    };
    return config[status] || config.active;
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="talents-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Jeunes Potentiels</h1>
            <p className="text-muted-foreground mt-1">Gérez vos talents et suivez leur progression</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ExportImportButtons
              data={talents}
              tableName="talents"
              filename="talents"
              exportColumns={['first_name', 'last_name', 'email', 'phone', 'birth_date', 'status', 'interests', 'aspirations', 'expertise', 'assigned_to']}
              importColumns={['first_name', 'last_name', 'email', 'phone', 'birth_date', 'status', 'interests', 'aspirations', 'expertise', 'assigned_to']}
              onImportComplete={fetchTalents}
            />
            <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-talent-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau talent
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedTalent ? 'Modifier le talent' : 'Nouveau talent'}</DialogTitle>
                <DialogDescription>{selectedTalent ? 'Modifiez les informations' : 'Ajoutez un nouveau jeune potentiel'}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom *</Label>
                    <Input id="first_name" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom *</Label>
                    <Input id="last_name" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Date de naissance</Label>
                    <Input id="birth_date" type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="follow_up">Suivi</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                        <SelectItem value="high_potential">Haut potentiel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Thèmes d'expertise</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg">
                    {EXPERTISE_CATEGORIES.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox id={`talent-${category.id}`} checked={formData.expertise.includes(category.id)} onCheckedChange={(checked) => handleExpertiseChange(category.id, checked)} />
                        <label htmlFor={`talent-${category.id}`} className="text-sm cursor-pointer">{category.name}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interests">Intérêts</Label>
                  <Textarea id="interests" value={formData.interests} onChange={(e) => setFormData({ ...formData, interests: e.target.value })} rows={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aspirations">Aspirations / Projets</Label>
                  <Textarea id="aspirations" value={formData.aspirations} onChange={(e) => setFormData({ ...formData, aspirations: e.target.value })} rows={3} />
                </div>

                <div className="space-y-2">
                  <Label>Documents</Label>
                  <div className="border rounded-lg p-3 space-y-3">
                    <label htmlFor="talent-file-upload" className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Cliquez pour ajouter des fichiers</span>
                      <input
                        id="talent-file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                    {pendingFiles.length > 0 && (
                      <div className="space-y-2">
                        {pendingFiles.map((pf, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate flex-1 min-w-0">{pf.file.name}</span>
                            <Select value={pf.category} onValueChange={(v) => updateFileCategory(index, v)}>
                              <SelectTrigger className="h-7 w-[130px] text-xs flex-shrink-0">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_CATEGORIES.map(cat => (
                                  <SelectItem key={cat.value} value={cat.value} className="text-xs">{cat.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => removePendingFile(index)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Enregistrement...' : (selectedTalent ? 'Mettre à jour' : 'Ajouter')}
                  </Button>
                </DialogFooter>
              </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un talent..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Statut" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="follow_up">Suivi</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                  <SelectItem value="high_potential">Haut potentiel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : filteredTalents.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun talent trouvé</p>
              </CardContent>
            </Card>
          ) : (
            filteredTalents.map((talent) => {
              const statusConfig = getStatusConfig(talent.status);
              return (
                <Card key={talent.id} className="hover:shadow-lg transition-all group" data-testid={`talent-card-${talent.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {talent.first_name?.charAt(0)}{talent.last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background ${statusConfig.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{talent.first_name} {talent.last_name}</h3>
                          <Badge className={`text-xs ${statusConfig.badge}`}>{statusConfig.label}</Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDetailDialog(talent)}><Eye className="h-4 w-4 mr-2" /> Voir détails</DropdownMenuItem>
                          {canEdit(talent) && <DropdownMenuItem onClick={() => openEditDialog(talent)}><Edit className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>}
                          {isAdmin() && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(talent.id)}><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2 mb-4">
                      {talent.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{talent.email}</span>
                        </div>
                      )}
                      {talent.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{talent.phone}</span>
                        </div>
                      )}
                      {talent.birth_date && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span>{formatDate(talent.birth_date)}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Expertises</p>
                      <div className="flex flex-wrap gap-1">
                        {talent.expertise?.length > 0 ? (
                          talent.expertise.map(exp => (
                            <Badge key={exp} variant="secondary" className="text-xs">{getExpertiseShort(exp)}</Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">Aucune expertise</span>
                        )}
                      </div>
                    </div>

                    {talent.interests && (
                      <div className="mt-3 p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Lightbulb className="h-3 w-3" /> Intérêts
                        </div>
                        <p className="text-xs line-clamp-2">{talent.interests}</p>
                      </div>
                    )}

                    {talent.aspirations && (
                      <div className="mt-2 p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                          <Target className="h-3 w-3" /> Aspirations
                        </div>
                        <p className="text-xs line-clamp-2">{talent.aspirations}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                {selectedTalent?.first_name} {selectedTalent?.last_name}
              </DialogTitle>
              <DialogDescription>Profil complet du talent</DialogDescription>
            </DialogHeader>

            {selectedTalent && (
              <ScrollArea className="flex-1 h-[400px] pr-4">
                <div className="space-y-6">
                  <div>
                    <Badge className={getStatusConfig(selectedTalent.status).badge}>
                      {getStatusConfig(selectedTalent.status).label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                      <p className="text-sm">{selectedTalent.email || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Téléphone</p>
                      <p className="text-sm">{selectedTalent.phone || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Date de naissance</p>
                      <p className="text-sm">{formatDate(selectedTalent.birth_date)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> Assigné à</p>
                      <p className="text-sm">{selectedTalent.assigned_to || 'Non assigné'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Thèmes d'expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTalent.expertise?.map(exp => (
                        <Badge key={exp} variant="secondary">{getExpertiseLabel(exp)}</Badge>
                      )) || <p className="text-sm text-muted-foreground">Aucune expertise</p>}
                    </div>
                  </div>

                  {selectedTalent.interests && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Intérêts</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedTalent.interests}</p>
                    </div>
                  )}

                  {selectedTalent.aspirations && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Target className="h-3 w-3" /> Aspirations / Projets</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedTalent.aspirations}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium flex items-center gap-2 mb-3"><FileText className="h-4 w-4" /> Documents</p>
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
                    ) : (
                      <div className="space-y-2">
                        {documents.map(doc => {
                          const catLabel = DOCUMENT_CATEGORIES.find(c => c.value === doc.document_category)?.label;
                          return (
                            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-sm truncate block">{doc.file_name}</span>
                                  {catLabel && (
                                    <Badge variant="outline" className="text-xs mt-0.5">{catLabel}</Badge>
                                  )}
                                </div>
                              </div>
                              <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Talents;
