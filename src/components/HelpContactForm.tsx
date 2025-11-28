import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, Send, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function HelpContactForm() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Vous devez être connecté pour envoyer un message');
      return;
    }

    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await (supabase as any)
        .from('support_messages')
        .insert({
          user_id: user.id,
          subject: formData.subject.trim(),
          message: formData.message.trim(),
          category: formData.category
        });

      if (error) throw error;

      toast.success('Votre message a été envoyé avec succès !');
      setFormData({
        subject: '',
        message: '',
        category: 'general'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erreur lors de l\'envoi du message');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Contactez notre équipe de support
        </CardTitle>
        <CardDescription>
          Besoin d'aide ? Envoyez-nous un message et nous vous répondrons dans les plus brefs délais.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Alternative de contact par mail */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Contact par email
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                Pour les problèmes urgents ou les demandes spéciales, contactez-nous directement :
              </p>
              <a
                href="mailto:support@s-ocial.com"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                <Mail className="h-4 w-4" />
                support@s-ocial.com
              </a>
            </div>
          </div>
        </div>

        {/* Formulaire de contact */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Catégorie</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Général</SelectItem>
                <SelectItem value="technical">Technique</SelectItem>
                <SelectItem value="account">Compte</SelectItem>
                <SelectItem value="billing">Facturation</SelectItem>
                <SelectItem value="abuse">Signalement d'abus</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="subject">Sujet *</Label>
            <Input
              id="subject"
              type="text"
              placeholder="Résumez votre demande en quelques mots"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.subject.length}/100 caractères
            </p>
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Décrivez votre problème ou votre question en détail..."
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={6}
              maxLength={1000}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.message.length}/1000 caractères
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>
              Notre équipe vous répondra généralement sous 24-48 heures.
            </span>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Envoyer le message
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            En envoyant ce message, vous acceptez que nous conservions vos informations
            pour vous fournir une assistance personnalisée.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
