import { Button } from '@/components/ui/button';
import { FileText, Image, Video, UserPlus } from 'lucide-react';

interface PostFiltersProps {
  activeFilter: 'all' | 'photos' | 'videos' | 'tagged';
  onFilterChange: (filter: 'all' | 'photos' | 'videos' | 'tagged') => void;
}

export const PostFilters = ({ activeFilter, onFilterChange }: PostFiltersProps) => {
  const filters = [
    { id: 'all', label: 'Publications', icon: FileText },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'videos', label: 'Vidéos', icon: Video },
    { id: 'tagged', label: 'Identifications', icon: UserPlus },
  ] as const;

  return (
    <div className="flex gap-2 p-1 bg-muted/50 rounded-lg mb-4">
      {filters.map((filter) => {
        const Icon = filter.icon;
        return (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className="flex-1 gap-2"
          >
            <Icon className="h-4 w-4" />
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
};