import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { EXPERTISE_CATEGORIES } from '../lib/supabase';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  Tags,
  Music,
  Palette,
  Tv,
  Users,
  Activity,
  Lightbulb,
  Heart,
  Factory,
  Recycle,
  Zap,
  Droplets,
  Leaf,
  TreePine,
  Sparkles,
  MapPin,
  Wheat,
  Sprout
} from 'lucide-react';

const EXPERTISE_ICONS = {
  cultural: { icon: Palette, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  sport: { icon: Activity, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  industry: { icon: Factory, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  resources: { icon: Leaf, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  luxury: { icon: Sparkles, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  agritech: { icon: Wheat, color: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-400' },
};

const EXPERTISE_IMAGES = {
  cultural: 'https://images.unsplash.com/photo-1764436271162-a99077ebd3cb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwxfHxjdWx0dXJhbCUyMGFydHMlMjBwZXJmb3JtYW5jZSUyMGFic3RyYWN0fGVufDB8fHx8MTc3MjI3MDgxOHww&ixlib=rb-4.1.0&q=85',
  industry: 'https://images.unsplash.com/photo-1761195696590-3490ea770aa1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTN8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwYXV0b21hdGlvbiUyMHRlY2hub2xvZ3l8ZW58MHx8fHwxNzcyMjcwODE5fDA&ixlib=rb-4.1.0&q=85',
  sport: 'https://images.unsplash.com/photo-1746003625471-8785a7d19d78?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwxfHxhdGhsZXRlJTIwdHJhaW5pbmclMjBwcm9mZXNzaW9uYWx8ZW58MHx8fHwxNzcyMjcwODIwfDA&ixlib=rb-4.1.0&q=85',
  resources: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=800',
  luxury: 'https://images.unsplash.com/photo-1590736969955-71cc94801759?w=800',
  agritech: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800',
};

const Expertise = () => {
  const { isAdmin } = useAuth();

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6" data-testid="expertise-page">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Thèmes d'expertise
          </h1>
          <p className="text-muted-foreground mt-1">
            Taxonomie des domaines d'expertise partagés
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EXPERTISE_CATEGORIES.map((category) => {
            const iconConfig = EXPERTISE_ICONS[category.id] || EXPERTISE_ICONS.cultural;
            const IconComponent = iconConfig.icon;
            const imageUrl = EXPERTISE_IMAGES[category.id];

            return (
              <Card 
                key={category.id} 
                className="overflow-hidden hover:shadow-lg transition-all duration-300"
                data-testid={`expertise-card-${category.id}`}
              >
                {/* Image Header */}
                <div 
                  className="h-32 bg-cover bg-center relative"
                  style={{ backgroundImage: `url('${imageUrl}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${iconConfig.color}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold text-foreground">
                      {category.name}
                    </h3>
                  </div>
                </div>

                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                    Sous-catégories
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories.map((sub, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="text-xs"
                      >
                        {sub}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
    </Layout>
  );
};

export default Expertise;
