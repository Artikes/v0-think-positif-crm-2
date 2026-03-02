import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, EXPERTISE_CATEGORIES } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
  GraduationCap,
  Mail,
  Phone,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Upload,
  Download,
  Award,
  Building
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

const DOCUMENT_CATEGORIES = [
  { value: 'cv', label: 'CV' },
  { value: 'identity', label: "Carte d'identit\u00e9" },
  { value: 'diploma', label: 'Dipl\u00f4me' },
  { value: 'certificate', label: 'Certificat' },
  { value: 'contract', label: 'Contrat' },
  { value: 'recommendation', label: 'Lettre de recommandation' },
  { value: 'other', label: 'Autre' },
];

const DIPLOMA_LEVELS = [
  { value: 'bac', label: 'Baccalauréat' },
  { value: 'bac+2', label: 'Bac+2 (BTS, DUT)' },
  { value: 'bac+3', label: 'Bac+3 (Licence)' },
  { value: 'bac+5', label: 'Bac+5 (Master)' },
  { value: 'bac+8', label: 'Bac+8 (Doctorat)' },
];

const Trainers = () => {
  const { isAdmin } = useAuth();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expertiseFilter, setExpertiseFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    diploma_level: 'bac+5',
    expertise: [],
    schools: '',
    comments: ''
  });
  const [documents, setDocuments] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('trainers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrainers(data || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      toast.error('Erreur lors du chargement des formateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerDocuments = async (trainerId) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'trainer')
        .eq('entity_id', trainerId);

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    try {
      const payload = {
        ...formData,
        expertise: formData.expertise
      };

      let trainerId = selectedTrainer?.id;

      if (selectedTrainer) {
        const { error } = await supabase
          .from('trainers')
          .update({
            ...payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedTrainer.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('trainers')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        trainerId = data.id;
      }

      // Upload pending files
      if (trainerId && pendingFiles.length > 0) {
        await uploadFilesForEntity(trainerId, 'trainer');
      }

      toast.success(selectedTrainer ? 'Formateur mis à jour' : 'Formateur ajouté');
      setShowAddDialog(false);
      resetForm();
      fetchTrainers();
    } catch (error) {
      console.error('Error saving trainer:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce formateur?')) return;

    try {
      const { error } = await supabase
        .from('trainers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Formateur supprimé');
      fetchTrainers();
    } catch (error) {
      console.error('Error deleting trainer:', error);
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

  const openEditDialog = (trainer) => {
    setSelectedTrainer(trainer);
    setFormData({
      first_name: trainer.first_name,
      last_name: trainer.last_name,
      email: trainer.email || '',
      phone: trainer.phone || '',
      diploma_level: trainer.diploma_level || 'bac+5',
      expertise: trainer.expertise || [],
      schools: trainer.schools || '',
      comments: trainer.comments || ''
    });
    setShowAddDialog(true);
  };

  const openDetailDialog = async (trainer) => {
    setSelectedTrainer(trainer);
    await fetchTrainerDocuments(trainer.id);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedTrainer(null);
    setPendingFiles([]);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      diploma_level: 'bac+5',
      expertise: [],
      schools: '',
      comments: ''
    });
  };

  const filteredTrainers = trainers.filter(trainer => {
    const fullName = `${trainer.first_name} ${trainer.last_name}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchQuery.toLowerCase()) ||
      trainer.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExpertise = expertiseFilter === 'all' || 
      (trainer.expertise && trainer.expertise.includes(expertiseFilter));
    return matchesSearch && matchesExpertise;
  });

  const getExpertiseLabel = (id) => {
    const category = EXPERTISE_CATEGORIES.find(c => c.id === id);
    return category?.name || id;
  };

  const getExpertiseShort = (id) => {
    const labels = {
      'cultural': 'Culture',
      'sport': 'Sport',
      'industry': 'Industrie',
      'resources': 'Ressources',
      'luxury': 'Luxe',
      'agritech': 'AgriTech'
    };
    return labels[id] || id;
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="trainers-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Formateurs</h1>
            <p className="text-muted-foreground mt-1">Gérez vos formateurs et leurs expertises</p>
          </div>

          <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-trainer-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau formateur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{selectedTrainer ? 'Modifier le formateur' : 'Nouveau formateur'}</DialogTitle>
                <DialogDescription>
                  {selectedTrainer ? 'Modifiez les informations du formateur' : 'Ajoutez un nouveau formateur'}
                </DialogDescription>
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
                  <div className="col-span-2 space-y-2">
                    <Label>Niveau de diplôme</Label>
                    <Select value={formData.diploma_level} onValueChange={(value) => setFormData({ ...formData, diploma_level: value })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIPLOMA_LEVELS.map(level => (
                          <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Domaines d'expertise</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border rounded-lg">
                    {EXPERTISE_CATEGORIES.map(category => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox id={category.id} checked={formData.expertise.includes(category.id)} onCheckedChange={(checked) => handleExpertiseChange(category.id, checked)} />
                        <label htmlFor={category.id} className="text-sm cursor-pointer">{category.name}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schools">Écoles partenaires</Label>
                  <Textarea id="schools" value={formData.schools} onChange={(e) => setFormData({ ...formData, schools: e.target.value })} rows={2} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments">Commentaires</Label>
                  <Textarea id="comments" value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} rows={3} />
                </div>

                <div className="space-y-2">
                  <Label>Documents</Label>
                  <div className="border rounded-lg p-3 space-y-3">
                    <label htmlFor="trainer-file-upload" className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Cliquez pour ajouter des fichiers</span>
                      <input
                        id="trainer-file-upload"
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
                    {uploading ? 'Enregistrement...' : (selectedTrainer ? 'Mettre à jour' : 'Ajouter')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un formateur..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={expertiseFilter} onValueChange={setExpertiseFilter}>
                <SelectTrigger className="w-full sm:w-[250px]"><SelectValue placeholder="Expertise" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les expertises</SelectItem>
                  {EXPERTISE_CATEGORIES.map(category => (
                    <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                  ))}
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
          ) : filteredTrainers.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun formateur trouvé</p>
              </CardContent>
            </Card>
          ) : (
            filteredTrainers.map((trainer) => (
              <Card key={trainer.id} className="hover:shadow-lg transition-all group" data-testid={`trainer-card-${trainer.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {trainer.first_name?.charAt(0)}{trainer.last_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{trainer.first_name} {trainer.last_name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Award className="h-3 w-3" />
                          {DIPLOMA_LEVELS.find(d => d.value === trainer.diploma_level)?.label || '-'}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetailDialog(trainer)}><Eye className="h-4 w-4 mr-2" /> Voir détails</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(trainer)}><Edit className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>
                        {isAdmin() && (
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(trainer.id)}><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 mb-4">
                    {trainer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{trainer.email}</span>
                      </div>
                    )}
                    {trainer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span>{trainer.phone}</span>
                      </div>
                    )}
                    {trainer.schools && (
                      <div className="flex items-center gap-2 text-sm">
                        <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{trainer.schools}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Expertises</p>
                    <div className="flex flex-wrap gap-1">
                      {trainer.expertise?.length > 0 ? (
                        trainer.expertise.map(exp => (
                          <Badge key={exp} variant="secondary" className="text-xs">
                            {getExpertiseShort(exp)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">Aucune expertise</span>
                      )}
                    </div>
                  </div>

                  {trainer.comments && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2 bg-muted/50 p-2 rounded">
                      {trainer.comments}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                {selectedTrainer?.first_name} {selectedTrainer?.last_name}
              </DialogTitle>
              <DialogDescription>Profil complet du formateur</DialogDescription>
            </DialogHeader>

            {selectedTrainer && (
              <ScrollArea className="flex-1 h-[400px] pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                      <p className="text-sm">{selectedTrainer.email || '-'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Téléphone</p>
                      <p className="text-sm">{selectedTrainer.phone || '-'}</p>
                    </div>
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-muted-foreground">Niveau de diplôme</p>
                      <p className="text-sm font-medium">{DIPLOMA_LEVELS.find(d => d.value === selectedTrainer.diploma_level)?.label || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Domaines d'expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTrainer.expertise?.map(exp => (
                        <Badge key={exp} variant="secondary">{getExpertiseLabel(exp)}</Badge>
                      )) || <p className="text-sm text-muted-foreground">Aucune expertise</p>}
                    </div>
                  </div>

                  {selectedTrainer.schools && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Écoles partenaires</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedTrainer.schools}</p>
                    </div>
                  )}

                  {selectedTrainer.comments && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Commentaires</p>
                      <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedTrainer.comments}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium flex items-center gap-2 mb-3"><FileText className="h-4 w-4" /> Documents</p>
                    {documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
                    ) : (
                      <div className="space-y-2">
                        {documents.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">{doc.file_name}</span>
                            </div>
                            <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                          </div>
                        ))}
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

export default Trainers;
