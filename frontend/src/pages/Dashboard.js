import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import {
  Users,
  GraduationCap,
  Star,
  Building2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
  ArrowRight,
  Euro,
  Activity,
  CheckSquare,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    clients: 0,
    trainers: 0,
    talents: 0,
    tasks: 0,
    revenue: 0,
    cost: 0,
    profit: 0
  });
  const [projectFinancials, setProjectFinancials] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [talentDistribution, setTalentDistribution] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [clientsRes, trainersRes, talentsRes, tasksRes] = await Promise.all([
        supabase.from('clients').select('id, revenue, cost, project_name, company_name, created_at', { count: 'exact' }),
        supabase.from('trainers').select('id', { count: 'exact' }),
        supabase.from('talents').select('id, status, created_at', { count: 'exact' }),
        supabase.from('tasks').select('id', { count: 'exact' }).neq('status', 'done')
      ]);

      const totalRevenue = clientsRes.data?.reduce((sum, c) => sum + (parseFloat(c.revenue) || 0), 0) || 0;
      const totalCost = clientsRes.data?.reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0) || 0;

      setStats({
        clients: clientsRes.count || 0,
        trainers: trainersRes.count || 0,
        talents: talentsRes.count || 0,
        tasks: tasksRes.count || 0,
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalRevenue - totalCost
      });

      // Build per-project financials
      const projects = (clientsRes.data || []).map(c => ({
        name: c.project_name || c.company_name || 'Sans nom',
        company: c.company_name,
        revenue: parseFloat(c.revenue) || 0,
        cost: parseFloat(c.cost) || 0,
        profit: (parseFloat(c.revenue) || 0) - (parseFloat(c.cost) || 0)
      })).filter(p => p.revenue > 0 || p.cost > 0);
      setProjectFinancials(projects);

      // Calculate talent distribution from real data
      const talents = talentsRes.data || [];
      const statusCounts = {
        active: talents.filter(t => t.status === 'active').length,
        follow_up: talents.filter(t => t.status === 'follow_up').length,
        inactive: talents.filter(t => t.status === 'inactive').length,
        high_potential: talents.filter(t => t.status === 'high_potential').length
      };
      
      setTalentDistribution([
        { name: 'Actifs', value: statusCounts.active || 0, color: '#22c55e' },
        { name: 'Suivi', value: statusCounts.follow_up || 0, color: '#f97316' },
        { name: 'Inactifs', value: statusCounts.inactive || 0, color: '#ef4444' },
        { name: 'Haut potentiel', value: statusCounts.high_potential || 0, color: '#3b82f6' },
      ].filter(item => item.value > 0));

      // Calculate monthly data from real data
      const clients = clientsRes.data || [];
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
      const currentYear = new Date().getFullYear();
      const last6Months = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.getMonth();
        const year = date.getFullYear();
        
        const clientsInMonth = clients.filter(c => {
          const created = new Date(c.created_at);
          return created.getMonth() === month && created.getFullYear() === year;
        }).length;
        
        const talentsInMonth = talents.filter(t => {
          const created = new Date(t.created_at);
          return created.getMonth() === month && created.getFullYear() === year;
        }).length;
        
        last6Months.push({
          month: monthNames[month],
          clients: clientsInMonth,
          talents: talentsInMonth
        });
      }
      
      setMonthlyData(last6Months);

      // Fetch recent tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`*, assignee:profiles!tasks_assigned_to_fkey(name)`)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5);
      setRecentTasks(tasksData || []);

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('schedules')
        .select(`*, user:profiles!schedules_user_id_fkey(name)`)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);
      setUpcomingEvents(eventsData || []);

      // Fetch recommendations
      const { data: recsData } = await supabase
        .from('recommendations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecommendations(recsData || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(parseFloat(value) || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'follow_up': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'missing_info': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'match': return <Star className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const PRIORITY_COLORS = {
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-800',
    medium: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30',
    high: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30',
    urgent: 'bg-red-100 text-red-600 dark:bg-red-900/30'
  };

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-8" data-testid="dashboard">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Tableau de bord
          </h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue, {profile?.name || 'Utilisateur'}
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/clients')} data-testid="kpi-clients">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Building2 className="h-8 w-8 text-blue-500 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg" />
                <span className="text-2xl font-bold">{stats.clients}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Clients</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trainers')} data-testid="kpi-trainers">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <GraduationCap className="h-8 w-8 text-green-500 p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg" />
                <span className="text-2xl font-bold">{stats.trainers}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Formateurs</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/talents')} data-testid="kpi-talents">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Star className="h-8 w-8 text-purple-500 p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg" />
                <span className="text-2xl font-bold">{stats.talents}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Talents</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/tasks')} data-testid="kpi-tasks">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <CheckSquare className="h-8 w-8 text-orange-500 p-1.5 bg-orange-100 dark:bg-orange-900/30 rounded-lg" />
                <span className="text-2xl font-bold">{stats.tasks}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Tâches en cours</p>
            </CardContent>
          </Card>

          {isAdmin() && (
            <>
              <Card className="hover:shadow-md transition-shadow" data-testid="kpi-revenue">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <TrendingUp className="h-8 w-8 text-emerald-500 p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg" />
                    <span className="text-xl font-bold">{formatCurrency(stats.revenue)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Chiffre d'affaires</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow" data-testid="kpi-cost">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <TrendingDown className="h-8 w-8 text-red-500 p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg" />
                    <span className="text-xl font-bold">{formatCurrency(stats.cost)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Coûts totaux</p>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow" data-testid="kpi-profit">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Euro className="h-8 w-8 text-blue-500 p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg" />
                    <span className={`text-xl font-bold ${stats.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(stats.profit)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Marge nette</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Tasks & Events Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Tasks */}
          <Card data-testid="recent-tasks-panel">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  Tâches à faire
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                  Voir tout <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 min-h-[200px]">
              {recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune tâche en cours</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                      {task.assignee && (
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">{task.assignee.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card data-testid="upcoming-events-panel">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Prochains événements
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/schedule')}>
                  Voir tout <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 min-h-[200px]">
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun événement à venir</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div 
                        className="w-1 h-12 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: event.color }} 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(event.start_time)}
                        </p>
                        {event.user && (
                          <p className="text-xs text-muted-foreground">{event.user.name}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row - Admin Only */}
        {isAdmin() && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8 pt-6 border-t">
            <Card className="lg:col-span-2" data-testid="chart-monthly">
              <CardHeader>
                <CardTitle className="text-lg">Évolution mensuelle</CardTitle>
                <CardDescription>Nouveaux clients et talents par mois</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="clients" fill="hsl(221, 83%, 53%)" name="Clients" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="talents" fill="hsl(173, 58%, 39%)" name="Talents" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="chart-distribution">
              <CardHeader>
                <CardTitle className="text-lg">Distribution talents</CardTitle>
                <CardDescription>Par statut</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={talentDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {talentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {talentDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Financial Overview - Admin Only */}
        {isAdmin() && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CA vs Cost Bar Chart */}
            <Card data-testid="chart-revenue-cost">
              <CardHeader>
                <CardTitle className="text-lg">CA vs Coûts</CardTitle>
                <CardDescription>Chiffre d'affaires et coûts par projet</CardDescription>
              </CardHeader>
              <CardContent>
                {projectFinancials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Euro className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune donnée financière</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={projectFinancials} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="name" type="category" className="text-xs" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#22c55e" name="CA" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="cost" fill="#ef4444" name="Coût" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Per-Project Financial Table */}
            <Card data-testid="table-project-financials">
              <CardHeader>
                <CardTitle className="text-lg">Détail par projet</CardTitle>
                <CardDescription>Revenus, coûts et marges par client/projet</CardDescription>
              </CardHeader>
              <CardContent>
                {projectFinancials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Aucun projet avec des données financières</p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Projet</TableHead>
                          <TableHead className="text-xs text-right">CA</TableHead>
                          <TableHead className="text-xs text-right">Coût</TableHead>
                          <TableHead className="text-xs text-right">Marge</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectFinancials.map((project, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs font-medium max-w-[140px] truncate">{project.name}</TableCell>
                            <TableCell className="text-xs text-right text-green-700 dark:text-green-400 font-medium">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(project.revenue)}
                            </TableCell>
                            <TableCell className="text-xs text-right text-red-600 dark:text-red-400 font-medium">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(project.cost)}
                            </TableCell>
                            <TableCell className={`text-xs text-right font-bold ${project.profit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(project.profit)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2 font-bold">
                          <TableCell className="text-xs">Total</TableCell>
                          <TableCell className="text-xs text-right text-green-700 dark:text-green-400">
                            {formatCurrency(stats.revenue)}
                          </TableCell>
                          <TableCell className="text-xs text-right text-red-600 dark:text-red-400">
                            {formatCurrency(stats.cost)}
                          </TableCell>
                          <TableCell className={`text-xs text-right ${stats.profit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                            {formatCurrency(stats.profit)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recommendations */}
        <Card data-testid="recommendations-panel">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Recommandations
            </CardTitle>
            <CardDescription>Actions suggérées pour optimiser votre activité</CardDescription>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Aucune recommandation pour le moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    {getRecommendationIcon(rec.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
