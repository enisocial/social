import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Smile } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FeelingSelectorProps {
  selected: string;
  onSelect: (feeling: string) => void;
}

const FEELINGS = [
  { emoji: '😊', label: 'heureux(se)' },
  { emoji: '😍', label: 'amoureux(se)' },
  { emoji: '😎', label: 'cool' },
  { emoji: '🥳', label: 'en fête' },
  { emoji: '😌', label: 'détendu(e)' },
  { emoji: '🤗', label: 'reconnaissant(e)' },
  { emoji: '😴', label: 'fatigué(e)' },
  { emoji: '🤔', label: 'pensif(ve)' },
  { emoji: '😢', label: 'triste' },
  { emoji: '😠', label: 'en colère' },
  { emoji: '😱', label: 'choqué(e)' },
  { emoji: '🤩', label: 'émerveillé(e)' },
  { emoji: '😋', label: 'affamé(e)' },
  { emoji: '🤒', label: 'malade' },
  { emoji: '💪', label: 'motivé(e)' },
  { emoji: '🙏', label: 'reconnaissant(e)' },
  { emoji: '🎉', label: 'en célébration' },
  { emoji: '😇', label: 'béni(e)' },
  { emoji: '🤓', label: 'concentré(e)' },
  { emoji: '😜', label: 'espiègle' },
];

export const FeelingSelector = ({ selected, onSelect }: FeelingSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredFeelings = FEELINGS.filter(feeling =>
    feeling.label.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (feeling: string) => {
    onSelect(feeling);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="gap-2">
          <Smile className="h-4 w-4 text-yellow-500" />
          {selected || 'Humeur'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Comment vous sentez-vous ?</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Rechercher une humeur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
          
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 gap-2">
              {filteredFeelings.map((feeling) => (
                <Button
                  key={feeling.label}
                  type="button"
                  variant="outline"
                  className="h-auto py-4 flex items-center gap-3 justify-start"
                  onClick={() => handleSelect(`${feeling.emoji} ${feeling.label}`)}
                >
                  <span className="text-2xl">{feeling.emoji}</span>
                  <span className="text-sm">{feeling.label}</span>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
