import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchExpertiseCategories, 
  createExpertiseCategory, 
  updateExpertiseCategory, 
  deleteExpertiseCategory,
  DEFAULT_EXPERTISE_CATEGORIES 
} from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Tags,
  Palette,
  Activity,
  Factory,
  Leaf,
  Sparkles,
  Wheat,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Music,
  Heart,
  Zap,
  Droplets,
  TreePine,
  MapPin,
  Sprout,
  Lightbulb,
  Users,
  Globe,
  Building,
  Briefcase,
  GraduationCap,
  Camera,
  Mic,
  Film
} from 'lucide-react';

const ICON_OPTIONS = [
  { value: 'Palette', label: 'Palette', Icon: Palette },
  { value: 'Activity', label: 'Activity', Icon: Activity },
  { value: 'Factory', label: 'Factory', Icon: Factory },
  { value: 'Leaf', label: 'Leaf', Icon: Leaf },
  { value: 'Sparkles', label: 'Sparkles', Icon: Sparkles },
  { value: 'Wheat', label: 'Wheat', Icon: Wheat },
  { value: 'Music', label: 'Music', Icon: Music },
  { value: 'Heart', label: 'Heart', Icon: Heart },
  { value: 'Zap', label: 'Zap', Icon: Zap },
  { value: 'Droplets', label: 'Droplets', Icon: Droplets },
  { value: 'TreePine', label: 'TreePine', Icon: TreePine },
  { value: 'MapPin', label: 'MapPin', Icon: MapPin },
  { value: 'Sprout', label: 'Sprout', Icon: Sprout },
  { value: 'Lightbulb', label: 'Lightbulb', Icon: Lightbulb },
  { value: 'Users', label: 'Users', Icon: Users },
  { value: 'Globe', label: 'Globe', Icon: Globe },
  { value: 'Building', label: 'Building', Icon: Building },
  { value: 'Briefcase', label: 'Briefcase', Icon: Briefcase },
  { value: 'GraduationCap', label: 'GraduationCap', Icon: GraduationCap },
  { value: 'Camera', label: 'Camera', Icon: Camera },
  { value: 'Mic', label: 'Mic', Icon: Mic },
  { value: 'Film', label: 'Film', Icon: Film },
  { value: 'Tags', label: 'Tags', Icon: Tags },
];

const COLOR_OPTIONS = [
  { value: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'Violet', preview: 'bg-purple-500' },
  { value: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Vert', preview: 'bg-green-500' },
  { value: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Bleu', preview: 'bg-blue-500' },
  { value: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Emeraude', preview: 'bg-emerald-500' },
  { value: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', label: 'Ambre', preview: 'bg-amber-500' },
  { value: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400', label: 'Lime', preview: 'bg-lime-500' },
  { value: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Rouge', preview: 'bg-red-500' },
  { value: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400', label: 'Rose', preview: 'bg-pink-500' },
  { value: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', label: 'Cyan', preview: 'bg-cyan-500' },
  { value: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Orange', preview: 'bg-orange-500' },
];

const getIconComponent = (iconName) => {
  const iconOption = ICON_OPTIONS.find(opt => opt.value === iconName);
  return iconOption ? iconOption.Icon : Tags;
};

const Expertise = () => {
  const { isAdmin } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    subcategories: [],
    icon: 'Tags',
    color: 'bg-gray-100 text-gray-700',
    image_url: ''
  });
  const [newSubcategory, setNewSubcategory] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchExpertiseCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      setCategories(DEFAULT_EXPERTISE_CATEGORIES);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        id: category.id,
        name: category.name,
        subcategories: category.subcategories || [],
        icon: category.icon || 'Tags',
        color: category.color || 'bg-gray-100 text-gray-700',
        image_url: category.image_url || ''
      });
    } else {
      setEditingCategory(null);
      setFormData({
        id: '',
        name: '',
        subcategories: [],
        icon: 'Tags',
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        image_url: ''
      });
    }
    setNewSubcategory('');
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setNewSubcategory('');
  };

  const handleAddSubcategory = () => {
    if (newSubcategory.trim() && !formData.subcategories.includes(newSubcategory.trim())) {
      setFormData(prev => ({
        ...prev,
        subcategories: [...prev.subcategories, newSubcategory.trim()]
      }));
      setNewSubcategory('');
    }
  };

  const handleRemoveSubcategory = (index) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingCategory) {
        await updateExpertiseCategory(editingCategory.id, formData);
      } else {
        // Generate ID from name if not provided
        const id = formData.id || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await createExpertiseCategory({
          ...formData,
          id,
          sort_order: categories.length
        });
      }
      await loadCategories();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    setSaving(true);
    try {
      await deleteExpertiseCategory(categoryToDelete.id);
      await loadCategories();
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erreur lors de la suppression: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="expertise-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              Thèmes d'expertise
            </h1>
            <p className="text-muted-foreground mt-1">
              Taxonomie des domaines d'expertise partagés
            </p>
          </div>
          {isAdmin() && (
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une catégorie
            </Button>
          )}
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            const IconComponent = getIconComponent(category.icon);
            const colorClass = category.color || 'bg-gray-100 text-gray-700';

            return (
              <Card 
                key={category.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
                data-testid={`expertise-card-${category.id}`}
              >
                {/* Image Header */}
                <div 
                  className="h-32 bg-cover bg-center relative"
                  style={{ 
                    backgroundImage: category.image_url 
                      ? `url('${category.image_url}')` 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  
                  {/* Admin Actions */}
                  {isAdmin() && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {category.name}
                    </h3>
                  </div>
                </div>

                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                    Sous-catégories ({category.subcategories?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories?.map((sub, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="text-xs"
                      >
                        {sub}
                      </Badge>
                    ))}
                    {(!category.subcategories || category.subcategories.length === 0) && (
                      <span className="text-sm text-muted-foreground italic">
                        Aucune sous-catégorie
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {categories.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Tags className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune catégorie</h3>
              <p className="text-muted-foreground text-center mb-4">
                Commencez par créer votre première catégorie d'expertise.
              </p>
              {isAdmin() && (
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une catégorie
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Tags className="h-5 w-5" />
              À propos des thèmes d'expertise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Utilisation</h4>
                <p className="text-sm text-muted-foreground">
                  Ces thèmes d'expertise sont utilisés pour catégoriser les formateurs et les talents. 
                  Ils permettent de faciliter la mise en relation et le suivi des compétences.
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Gestion</h4>
                <p className="text-sm text-muted-foreground">
                  Les catégories sont partagées entre tous les profils. 
                  {isAdmin() 
                    ? " En tant qu'administrateur, vous pouvez les personnaliser selon vos besoins."
                    : " Contactez un administrateur pour modifier les catégories."
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? 'Modifiez les informations de cette catégorie d\'expertise.'
                : 'Créez une nouvelle catégorie d\'expertise pour classifier les formateurs et talents.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la catégorie *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Industrie du Futur"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icône</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.Icon className="h-4 w-4" />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Couleur</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 rounded ${opt.preview}`} />
                          <span>{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image_url">URL de l'image (optionnel)</Label>
              <Input
                id="image_url"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Sous-catégories</Label>
              <div className="flex gap-2">
                <Input
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  placeholder="Ajouter une sous-catégorie"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubcategory();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddSubcategory}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.subcategories.map((sub, index) => (
                  <Badge key={index} variant="secondary" className="gap-1 pr-1">
                    {sub}
                    <button
                      type="button"
                      onClick={() => handleRemoveSubcategory(index)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !formData.name}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCategory ? 'Enregistrer' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la catégorie "{categoryToDelete?.name}" ?
              Cette action est irréversible. Les formateurs et talents associés à cette catégorie
              ne seront pas supprimés mais perdront leur association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Expertise;
