import React, { useState, useEffect, useCallback } from 'react';
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
import { ScrollArea } from '../components/ui/scroll-area';
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
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Edit,
  Trash2,
  Filter,
  X,
  Download,
  Loader2,
  Check
} from 'lucide-react';
import { Checkbox } from '../components/ui/checkbox';
import ExportImportButtons from '../components/ExportImportButtons';

const EVENT_TYPES = {
  meeting: { label: 'Réunion', color: '#3b82f6' },
  training: { label: 'Formation', color: '#22c55e' },
  client: { label: 'Client', color: '#f97316' },
  personal: { label: 'Personnel', color: '#8b5cf6' },
  other: { label: 'Autre', color: '#6b7280' },
};

const Schedule = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [showGoogleImport, setShowGoogleImport] = useState(false);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [selectedGoogleEvents, setSelectedGoogleEvents] = useState([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    event_type: 'meeting',
    location: '',
    color: '#3b82f6',
    assigned_to: ''
  });

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const fetchEvents = useCallback(async () => {
    try {
      const startOfWeek = getStartOfWeek(currentDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const { data, error } = await supabase
        .from('schedules')
        .select(`
          *,
          user:profiles!schedules_user_id_fkey(id, name, email),
          assignee:profiles!schedules_assigned_to_fkey(id, name, email)
        `)
        .gte('start_time', startOfWeek.toISOString())
        .lte('start_time', endOfWeek.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erreur lors du chargement du planning');
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('id, name, email');
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, [currentDate, fetchEvents]);

  const getWeekDays = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const sendScheduleNotification = async (assigneeId, eventData) => {
    // Find assignee details
    const assignee = users.find(u => u.id === assigneeId);
    if (!assignee?.email) return;

    try {
      await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'schedule_assignment',
          to: assignee.email,
          assigneeName: assignee.name || assignee.email,
          assignerName: profile?.name || profile?.email || 'Un membre',
          itemTitle: eventData.title,
          itemDescription: eventData.description,
          itemType: eventData.event_type,
          startTime: eventData.start_time,
          endTime: eventData.end_time,
          location: eventData.location
        })
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Don't show error to user - notification is not critical
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        start_time: formData.start_time,
        end_time: formData.end_time,
        event_type: formData.event_type,
        location: formData.location || null,
        color: EVENT_TYPES[formData.event_type]?.color || '#3b82f6',
        user_id: profile?.id || null,
        assigned_to: formData.assigned_to || null
      };

      // Check if assignee changed or is new
      const isNewAssignment = formData.assigned_to && 
        (!selectedEvent || selectedEvent.assigned_to !== formData.assigned_to);

      if (selectedEvent) {
        const { error } = await supabase
          .from('schedules')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', selectedEvent.id);
        if (error) throw error;
        toast.success('Événement mis à jour');
      } else {
        const { error } = await supabase
          .from('schedules')
          .insert([payload]);
        if (error) throw error;
        toast.success('Événement créé');
      }

      // Send email notification if new assignment
      if (isNewAssignment) {
        sendScheduleNotification(formData.assigned_to, formData);
      }

      setShowAddDialog(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet événement?')) return;
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      toast.success('Événement supprimé');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Google Calendar Integration
  const handleGoogleConnect = async () => {
    try {
      const response = await fetch(`/api/google-calendar?action=auth-url&userId=${profile?.id}`);
      const data = await response.json();
      if (data.authUrl) {
        // Open in popup window
        const width = 500;
        const height = 600;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        const popup = window.open(
          data.authUrl,
          'Google Calendar Authorization',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        // Listen for the callback
        const handleMessage = async (event) => {
          if (event.data?.type === 'google-auth-callback') {
            window.removeEventListener('message', handleMessage);
            popup?.close();
            
            if (event.data.code) {
              await exchangeCodeForToken(event.data.code);
            }
          }
        };
        window.addEventListener('message', handleMessage);
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast.error('Erreur de connexion à Google');
    }
  };

  const exchangeCodeForToken = async (code) => {
    try {
      setGoogleLoading(true);
      const response = await fetch(`/api/google-calendar?action=callback&code=${code}`);
      const data = await response.json();
      
      if (data.tokens) {
        localStorage.setItem('google_calendar_token', JSON.stringify(data.tokens));
        setGoogleConnected(true);
        toast.success('Connecté à Google Calendar');
        await fetchGoogleEvents(data.tokens.access_token);
      }
    } catch (error) {
      console.error('Error exchanging code:', error);
      toast.error('Erreur lors de l\'authentification');
    } finally {
      setGoogleLoading(false);
    }
  };

  const fetchGoogleEvents = async (accessToken) => {
    try {
      setGoogleLoading(true);
      const startOfWeek = getStartOfWeek(currentDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 30); // Fetch 30 days

      const response = await fetch('/api/google-calendar?action=fetch-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          startDate: startOfWeek.toISOString(),
          endDate: endOfWeek.toISOString()
        })
      });

      const data = await response.json();
      if (data.events) {
        setGoogleEvents(data.events);
        setSelectedGoogleEvents([]);
      }
    } catch (error) {
      console.error('Error fetching Google events:', error);
      toast.error('Erreur lors de la récupération des événements');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleOpenGoogleImport = async () => {
    setShowGoogleImport(true);
    const storedToken = localStorage.getItem('google_calendar_token');
    if (storedToken) {
      const tokens = JSON.parse(storedToken);
      if (tokens.expiry_date > Date.now()) {
        setGoogleConnected(true);
        await fetchGoogleEvents(tokens.access_token);
      } else {
        setGoogleConnected(false);
        localStorage.removeItem('google_calendar_token');
      }
    }
  };

  const toggleGoogleEventSelection = (eventId) => {
    setSelectedGoogleEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const selectAllGoogleEvents = () => {
    if (selectedGoogleEvents.length === googleEvents.length) {
      setSelectedGoogleEvents([]);
    } else {
      setSelectedGoogleEvents(googleEvents.map(e => e.id));
    }
  };

  const importSelectedGoogleEvents = async () => {
    if (selectedGoogleEvents.length === 0) {
      toast.error('Sélectionnez au moins un événement');
      return;
    }

    try {
      setGoogleLoading(true);
      const eventsToImport = googleEvents.filter(e => selectedGoogleEvents.includes(e.id));
      
      const mappedEvents = eventsToImport.map(event => ({
        title: event.title,
        description: event.description || null,
        start_time: event.start_time,
        end_time: event.end_time,
        event_type: 'other',
        location: event.location || null,
        color: EVENT_TYPES.other.color,
        user_id: profile?.id,
        assigned_to: profile?.id,
        google_event_id: event.id
      }));

      const { error } = await supabase.from('schedules').insert(mappedEvents);
      if (error) throw error;

      toast.success(`${mappedEvents.length} événement(s) importé(s)`);
      setShowGoogleImport(false);
      setSelectedGoogleEvents([]);
      fetchEvents();
    } catch (error) {
      console.error('Error importing events:', error);
      toast.error('Erreur lors de l\'importation');
    } finally {
      setGoogleLoading(false);
    }
  };

  const openEditDialog = (event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      start_time: event.start_time.slice(0, 16),
      end_time: event.end_time.slice(0, 16),
      event_type: event.event_type,
      location: event.location || '',
      color: event.color,
      assigned_to: event.assigned_to || ''
    });
    setShowAddDialog(true);
  };

  const openAddDialog = (date = null) => {
    resetForm();
    if (date) {
      const startTime = new Date(date);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(10, 0, 0, 0);
      setFormData(prev => ({
        ...prev,
        start_time: startTime.toISOString().slice(0, 16),
        end_time: endTime.toISOString().slice(0, 16)
      }));
    }
    setShowAddDialog(true);
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setFormData({
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      event_type: 'meeting',
      location: '',
      color: '#3b82f6',
      assigned_to: ''
    });
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getFilteredEvents = () => {
    return events.filter(event => {
      // Filter by type
      if (filterType !== 'all' && event.event_type !== filterType) {
        return false;
      }
      // Filter by assignee
      if (filterAssignee !== 'all' && event.assigned_to !== filterAssignee) {
        return false;
      }
      return true;
    });
  };

  const getEventsForDay = (date) => {
    return getFilteredEvents().filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const hasActiveFilters = filterType !== 'all' || filterAssignee !== 'all';

  const clearFilters = () => {
    setFilterType('all');
    setFilterAssignee('all');
  };

  const weekDays = getWeekDays();

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="schedule-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight">Planning</h1>
            <p className="text-muted-foreground mt-1">Planning partagé de l'équipe</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ExportImportButtons
              data={events}
              tableName="schedules"
              filename="planning"
              exportColumns={['title', 'description', 'start_time', 'end_time', 'event_type', 'location', 'color']}
              importColumns={['title', 'description', 'start_time', 'end_time', 'event_type', 'location', 'color']}
              onImportComplete={fetchEvents}
            />
            <Button variant="outline" onClick={handleOpenGoogleImport}>
              <Download className="h-4 w-4 mr-2" />
              Importer Google Calendar
            </Button>
            <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-event-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvel événement
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{selectedEvent ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle>
                <DialogDescription>
                  {selectedEvent ? 'Modifiez les détails de l\'événement' : 'Ajoutez un événement au planning'}
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
                    data-testid="event-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Début *</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Fin *</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Lieu</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Optionnel"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Assigné à</Label>
                  <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v === 'none' ? '' : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un membre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {user.name || user.email}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="event-submit-btn">
                    {selectedEvent ? 'Mettre à jour' : 'Créer'}
                  </Button>
                </DialogFooter>
              </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Calendar Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={() => navigateWeek(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h2 className="font-semibold">
                  {weekDays[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {weekDays[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateWeek(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {Object.entries(EVENT_TYPES).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtres</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Type d'événement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {Object.entries(EVENT_TYPES).map(([key, { label, color }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Assigné à" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les membres</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {user.name || user.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                    <X className="h-4 w-4 mr-1" />
                    Effacer
                  </Button>
                )}
              </div>
              {hasActiveFilters && (
                <div className="text-sm text-muted-foreground ml-auto">
                  {getFilteredEvents().length} événement(s) affiché(s)
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Week View - Desktop: 7-column grid, Mobile: stacked list */}
        {/* Mobile view */}
        <div className="block md:hidden space-y-3">
          {weekDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);
            
            return (
              <Card 
                key={index} 
                className={today ? 'ring-2 ring-primary' : ''}
                data-testid={`schedule-day-${index}`}
              >
                <CardHeader className="p-3 pb-2">
                  <div 
                    className={`flex items-center justify-between cursor-pointer hover:bg-muted rounded-lg p-2 transition-colors ${today ? 'bg-primary text-primary-foreground rounded-lg' : ''}`}
                    onClick={() => openAddDialog(day)}
                  >
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-bold">{day.getDate()}</p>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                        </p>
                        <p className="text-xs opacity-70">
                          {day.toLocaleDateString('fr-FR', { month: 'long' })}
                        </p>
                      </div>
                    </div>
                    <Badge variant={today ? 'secondary' : 'outline'} className="text-xs">
                      {dayEvents.length} evt
                    </Badge>
                  </div>
                </CardHeader>
                {dayEvents.length > 0 && (
                  <CardContent className="p-3 pt-0">
                    <div className="space-y-2">
                      {dayEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
                          onClick={() => openEditDialog(event)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-sm" style={{ color: event.color }}>
                              {event.title}
                            </div>
                            <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                              {EVENT_TYPES[event.event_type]?.label || event.event_type}
                            </Badge>
                          </div>
<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                                            <span className="flex items-center gap-1">
                                              <Clock className="h-3 w-3" />
                                              {formatTime(event.start_time)} - {formatTime(event.end_time)}
                                            </span>
                                            {event.assignee && (
                                              <span className="flex items-center gap-1 text-primary">
                                                <User className="h-3 w-3" />
                                                {event.assignee.name || event.assignee.email}
                                              </span>
                                            )}
                                            {event.location && (
                                              <span className="flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {event.location}
                                              </span>
                                            )}
                                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>

        {/* Desktop view */}
        <div className="hidden md:grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const dayEvents = getEventsForDay(day);
            const today = isToday(day);
            
            return (
              <Card 
                key={index} 
                className={`min-h-[300px] ${today ? 'ring-2 ring-primary' : ''}`}
                data-testid={`schedule-day-desktop-${index}`}
              >
                <CardHeader className="p-3 pb-2">
                  <div 
                    className={`text-center cursor-pointer hover:bg-muted rounded-lg p-2 transition-colors ${today ? 'bg-primary text-primary-foreground rounded-lg' : ''}`}
                    onClick={() => openAddDialog(day)}
                  >
                    <p className="text-xs uppercase tracking-wider">
                      {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold">{day.getDate()}</p>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <ScrollArea className="h-[220px]">
                    <div className="space-y-2">
                      {dayEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Aucun événement
                        </p>
                      ) : (
                        dayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="p-2 rounded-md text-xs cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ backgroundColor: `${event.color}20`, borderLeft: `3px solid ${event.color}` }}
                            onClick={() => openEditDialog(event)}
                          >
                            <div className="font-medium truncate" style={{ color: event.color }}>
                              {event.title}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground mt-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(event.start_time)} - {formatTime(event.end_time)}
                            </div>
                            {event.assignee && (
                              <div className="flex items-center gap-1 text-primary mt-1">
                                <User className="h-3 w-3" />
                                {event.assignee.name || event.assignee.email}
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Google Calendar Import Dialog */}
      <Dialog open={showGoogleImport} onOpenChange={setShowGoogleImport}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M19.5 3.5H4.5C3.67 3.5 3 4.17 3 5V19C3 19.83 3.67 20.5 4.5 20.5H19.5C20.33 20.5 21 19.83 21 19V5C21 4.17 20.33 3.5 19.5 3.5Z" stroke="#4285F4" strokeWidth="2"/>
                <path d="M16 2V5" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 2V5" stroke="#EA4335" strokeWidth="2" strokeLinecap="round"/>
                <path d="M3 9H21" stroke="#FBBC05" strokeWidth="2"/>
                <rect x="7" y="12" width="4" height="4" fill="#34A853"/>
              </svg>
              Importer depuis Google Calendar
            </DialogTitle>
            <DialogDescription>
              Connectez-vous à votre compte Google pour importer vos événements
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!googleConnected ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg viewBox="0 0 24 24" className="h-16 w-16 mx-auto opacity-50" fill="none">
                    <path d="M19.5 3.5H4.5C3.67 3.5 3 4.17 3 5V19C3 19.83 3.67 20.5 4.5 20.5H19.5C20.33 20.5 21 19.83 21 19V5C21 4.17 20.33 3.5 19.5 3.5Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M16 2V5M8 2V5M3 9H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <p className="text-muted-foreground mb-4">
                  Connectez votre compte Google pour voir et importer vos événements
                </p>
                <Button onClick={handleGoogleConnect} disabled={googleLoading}>
                  {googleLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connexion...</>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Se connecter avec Google
                    </>
                  )}
                </Button>
              </div>
            ) : googleLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Chargement des événements...</p>
              </div>
            ) : googleEvents.length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Aucun événement trouvé dans les 30 prochains jours</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedGoogleEvents.length === googleEvents.length}
                      onCheckedChange={selectAllGoogleEvents}
                    />
                    <span className="text-sm">Tout sélectionner ({googleEvents.length} événements)</span>
                  </div>
                  <Badge variant="outline">
                    {selectedGoogleEvents.length} sélectionné(s)
                  </Badge>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div className="p-2 space-y-2">
                    {googleEvents.map((event) => (
                      <div 
                        key={event.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedGoogleEvents.includes(event.id) 
                            ? 'bg-primary/10 border-primary' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => toggleGoogleEventSelection(event.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox 
                            checked={selectedGoogleEvents.includes(event.id)}
                            onCheckedChange={() => toggleGoogleEventSelection(event.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{event.title}</p>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <CalendarIcon className="h-3 w-3" />
                              {new Date(event.start_time).toLocaleDateString('fr-FR', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short'
                              })}
                              {!event.isAllDay && (
                                <>
                                  <Clock className="h-3 w-3 ml-2" />
                                  {new Date(event.start_time).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                  {' - '}
                                  {new Date(event.end_time).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </>
                              )}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </div>
                            )}
                          </div>
                          {selectedGoogleEvents.includes(event.id) && (
                            <Check className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoogleImport(false)}>
              Annuler
            </Button>
            {googleConnected && googleEvents.length > 0 && (
              <Button 
                onClick={importSelectedGoogleEvents} 
                disabled={selectedGoogleEvents.length === 0 || googleLoading}
              >
                {googleLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importation...</>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Importer ({selectedGoogleEvents.length})
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Schedule;
