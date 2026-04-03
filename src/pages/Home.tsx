import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHub } from '../contexts/HubContext';
import { Card } from '../components/ui/Card';
import { Image, UtensilsCrossed, Building2, ChartBar as BarChart3, UsersRound, Smile, Music2, Network } from 'lucide-react';
import { TrainingTooltip } from '../components/training/TrainingTooltip';
import { WelcomeTour } from '../components/training/WelcomeTour';
import { TOOLTIPS } from '../components/training/training-content';

const features = [
  { path: '/media', label: 'Media Gallery', icon: Image, description: 'Photos and Videos', trainingId: 'media' },
  { path: '/recipes', label: 'Family Recipes', icon: UtensilsCrossed, description: 'Shared Recipes', trainingId: 'recipes' },
  { path: '/properties', label: 'Lake Houses', icon: Building2, description: 'Manage Bookings', trainingId: 'properties' },
  { path: '/polls', label: 'Polls', icon: BarChart3, description: 'Vote on Decisions', trainingId: 'polls' },
  { path: '/crowdfunding', label: 'Crowdfunding', icon: UsersRound, description: 'Project Support', trainingId: 'crowdfunding' },
  { path: '/jokes', label: 'Jokes and Stories', icon: Smile, description: 'Preserved Here', trainingId: 'jokes' },
  { path: '/music', label: 'Family Music', icon: Music2, description: 'Preserved Here', trainingId: 'music' },
  { path: '/family-tree', label: 'Family Tree', icon: Network, description: 'Campbell Genealogy', trainingId: 'members' },
];

export default function Home() {
  const { profile } = useAuth();
  const { settings } = useHub();

  return (
    <>
      <WelcomeTour />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="font-logo text-4xl text-[var(--text-primary)] mb-2">
            Welcome Back, {profile?.display_name?.split(' ')[0] || 'Family'}!
          </h1>
          <p className="text-[var(--text-secondary)]">
            {settings?.tagline || 'Where Family Comes Together'}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature) => (
            <TrainingTooltip
              key={feature.path}
              tipId={feature.trainingId}
              content={TOOLTIPS[feature.trainingId]?.content || ''}
              position="top"
            >
              <Link to={feature.path} data-training={`${feature.trainingId}-card`}>
                <Card className="text-center h-full">
                  <feature.icon className="mx-auto mb-3 text-[var(--accent-gold)]" size={32} />
                  <h3 className="font-medium text-[var(--text-primary)] mb-1">{feature.label}</h3>
                  <p className="text-sm text-[var(--text-muted)]">{feature.description}</p>
                </Card>
              </Link>
            </TrainingTooltip>
          ))}
        </div>
      </div>
    </>
  );
}
