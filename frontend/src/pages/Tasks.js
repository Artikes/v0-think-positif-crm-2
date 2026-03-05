import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
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
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  User,
  Flag
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import ExportImportButtons from '../components/ExportImportButtons';

const TASK_STATUS = {
  todo: { label: 'À faire', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: Circle, border: 'border-l-slate-400', bg: 'bg-slate-50/50 dark:bg-slate-900/20', headerColor: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  in_progress: { label: 'En cours', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Clock, border: 'border-l-blue-500', bg: 'bg-blue-50/50 dark:bg-blue-950/20', headerColor: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  review: { label: 'En révision', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle, border: 'border-l-orange-500', bg: 'bg-orange-50/50 dark:bg-orange-950/20', headerColor: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  done: { label: 'Terminé', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2, border: 'border-l-green-500', bg: 'bg-green-50/50 dark:bg-green-950/20', headerColor: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
};

const TASK_PRIORITY = {
  low: { label: 'Basse', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  medium: { label: 'Moyenne', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
};

const Tasks = () => {
  const { isAdmin, profile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    assigned_to: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assigned_to_fkey(id, name, email),
          creator:profiles!tasks_created_by_fkey(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
        created_by: profile?.id
      };

      if (selectedTask) {
        const { error } = await supabase
          .from('tasks')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', selectedTask.id);
        if (error) throw error;
        toast.success('Tâche mise à jour');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([payload]);
        if (error) throw error;
        toast.success('Tâche créée');
      }

      setShowAddDialog(false);
      resetForm();
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) throw error;
      toast.success('Statut mis à jour');
      fetchTasks();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette tâche?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      toast.success('Tâche supprimée');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditDialog = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      due_date: task.due_date || '',
      assigned_to: task.assigned_to || ''
    });
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setSelectedTask(null);
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      due_date: '',
      assigned_to: ''
    });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const isOverdue = (date) => {
    if (!date) return false;
    return new Date(date) < new Date() && new Date(date).toDateString() !== new Date().toDateString();
  };

  const groupedTasks = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    review: filteredTasks.filter(t => t.status === 'review'),
    done: filteredTasks.filter(t => t.status === 'done'),
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="tasks-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Tâches</h1>
            <p className="text-muted-foreground mt-1">Gérez et suivez vos tâches</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportImportButtons
              data={tasks}
              tableName="tasks"
              filename="taches"
              exportColumns={['title', 'description', 'status', 'priority', 'due_date', 'assigned_to']}
              importColumns={['title', 'description', 'status', 'priority', 'due_date', 'assigned_to']}
              onImportComplete={fetchTasks}
            />
            <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-task-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle tâche
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{selectedTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
                <DialogDescription>
                  {selectedTask ? 'Modifiez les détails de la tâche' : 'Créez une nouvelle tâche'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    data-testid="task-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    data-testid="task-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger data-testid="task-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_STATUS).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priorité</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger data-testid="task-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TASK_PRIORITY).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Date d'échéance</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      data-testid="task-duedate-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assigné à</Label>
                    <Select value={formData.assigned_to || "unassigned"} onValueChange={(v) => setFormData({ ...formData, assigned_to: v === "unassigned" ? "" : v })}>
                      <SelectTrigger data-testid="task-assignee-select">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Non assigné</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="task-submit-btn">
                    {selectedTask ? 'Mettre à jour' : 'Créer'}
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
                <Input
                  placeholder="Rechercher une tâche..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="task-search-input"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]" data-testid="task-status-filter">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(TASK_STATUS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(TASK_STATUS).map(([status, config]) => {
            const StatusIcon = config.icon;
            const tasksInStatus = groupedTasks[status];
            
            return (
              <div key={status} className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg}`}>
                  <div className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
                  <h3 className={`font-semibold text-sm ${config.headerColor}`}>{config.label}</h3>
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {tasksInStatus.length}
                  </Badge>
                </div>
                
                <div className="space-y-3 min-h-[200px]">
                  {tasksInStatus.map((task) => (
                    <Card 
                      key={task.id} 
                      className={`hover:shadow-md transition-all cursor-pointer group border-l-4 ${config.border} ${task.status === 'done' ? 'opacity-75' : ''}`}
                      data-testid={`task-card-${task.id}`}
                    >
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm leading-tight flex-1">{task.title}</h4>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(task)}>
                                <Edit className="h-4 w-4 mr-2" /> Modifier
                              </DropdownMenuItem>
                              {isAdmin() && (
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(task.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`text-xs ${TASK_PRIORITY[task.priority]?.color}`}>
                            <Flag className="h-3 w-3 mr-1" />
                            {TASK_PRIORITY[task.priority]?.label}
                          </Badge>
                          
                          {task.due_date && (
                            <Badge variant="outline" className={`text-xs ${isOverdue(task.due_date) && task.status !== 'done' ? 'border-red-500 text-red-500' : ''}`}>
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(task.due_date)}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t">
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/10">
                                  {task.assignee.name?.charAt(0)?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                {task.assignee.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Non assigné</span>
                          )}
                          
                          <Select 
                            value={task.status} 
                            onValueChange={(v) => handleStatusChange(task.id, v)}
                          >
                            <SelectTrigger className="h-6 w-auto text-xs border-0 bg-transparent p-0 pr-6">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TASK_STATUS).map(([key, { label }]) => (
                                <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {tasksInStatus.length === 0 && (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                      <p className="text-xs text-muted-foreground">Aucune tâche</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
};

export default Tasks;
