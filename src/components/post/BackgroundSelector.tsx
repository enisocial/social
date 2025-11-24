import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Palette } from 'lucide-react';
import { useState } from 'react';

const BACKGROUNDS = [
  { id: '', label: 'Aucun', color: 'transparent' },
  { id: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', label: 'Violet' },
  { id: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', label: 'Rose' },
  { id: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', label: 'Bleu' },
  { id: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', label: 'Vert' },
  { id: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', label: 'Coucher de soleil' },
  { id: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', label: 'Océan' },
  { id: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', label: 'Pastel' },
  { id: 'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)', label: 'Orange' },
];

interface BackgroundSelectorProps {
  selected: string;
  onSelect: (bg: string) => void;
}

export const BackgroundSelector = ({ selected, onSelect }: BackgroundSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-2">
          <Palette className="h-4 w-4 text-purple-500" />
          Arrière-plan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choisir un arrière-plan</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-3 gap-3">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              type="button"
              className={`aspect-square rounded-lg border-2 transition-all ${
                selected === bg.id ? 'border-primary scale-95' : 'border-transparent'
              }`}
              style={{ background: bg.id || '#f0f0f0' }}
              onClick={() => {
                onSelect(bg.id);
                setOpen(false);
              }}
            >
              {bg.id === '' && (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium">
                  Aucun
                </div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};