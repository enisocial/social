import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MapPin } from 'lucide-react';

interface LocationInputProps {
  selected: string;
  onSelect: (location: string) => void;
}

const POPULAR_LOCATIONS = [
  'Paris, France',
  'Lyon, France',
  'Marseille, France',
  'Toulouse, France',
  'Nice, France',
  'Nantes, France',
  'Strasbourg, France',
  'Bordeaux, France',
];

export const LocationInput = ({ selected, onSelect }: LocationInputProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredLocations = POPULAR_LOCATIONS.filter(location =>
    location.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (location: string) => {
    onSelect(location);
    setOpen(false);
  };

  const handleCustomLocation = () => {
    if (search.trim()) {
      onSelect(search.trim());
      setOpen(false);
      setSearch('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-2">
          <MapPin className="h-4 w-4 text-red-500" />
          {selected || 'Lieu'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Où êtes-vous ?</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Entrer un lieu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCustomLocation();
                }
              }}
            />
            <Button onClick={handleCustomLocation} disabled={!search.trim()}>
              Ajouter
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Lieux populaires</div>
            <div className="space-y-1">
              {filteredLocations.map((location) => (
                <Button
                  key={location}
                  type="button"
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => handleSelect(location)}
                >
                  <MapPin className="h-4 w-4 text-red-500" />
                  {location}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
