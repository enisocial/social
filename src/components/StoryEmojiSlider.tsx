import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StoryEmojiSliderProps {
  storyId: string;
  emoji: string;
  label: string;
}

export const StoryEmojiSlider = ({ storyId, emoji, label }: StoryEmojiSliderProps) => {
  const [value, setValue] = useState([50]);
  const [hasReacted, setHasReacted] = useState(false);

  useEffect(() => {
    checkExistingReaction();
  }, [storyId]);

  const checkExistingReaction = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('story_reactions')
      .select('slider_value')
      .eq('story_id', storyId)
      .eq('user_id', user.id)
      .single();

    if (data) {
      setValue([data.slider_value]);
      setHasReacted(true);
    }
  };

  const handleReaction = async (newValue: number[]) => {
    setValue(newValue);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('story_reactions')
        .upsert({
          story_id: storyId,
          user_id: user.id,
          emoji: emoji,
          slider_value: newValue[0],
        });

      if (error) throw error;

      if (!hasReacted) {
        setHasReacted(true);
        toast.success('Réaction envoyée');
      }
    } catch (error) {
      console.error('Error sending reaction:', error);
      toast.error('Erreur lors de l\'envoi de la réaction');
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        <span className="text-white text-sm font-medium">{label}</span>
        <span className="text-white text-lg font-bold">{value[0]}%</span>
      </div>
      <Slider
        value={value}
        onValueChange={handleReaction}
        max={100}
        step={1}
        className="cursor-pointer"
      />
    </div>
  );
};
