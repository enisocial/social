import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User, MapPin, Briefcase, GraduationCap,
  Heart, Calendar, Globe, Phone, Camera,
  CheckCircle, ArrowLeft, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfileField {
  key: string;
  label: string;
  icon: React.ReactNode;
  type: 'text' | 'textarea' | 'select' | 'date';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  weight: number;
}

const profileFields: ProfileField[] = [
  {
    key: 'bio',
    label: 'Biographie',
    icon: <User className="h-4 w-4" />,
    type: 'textarea',
    placeholder: 'Parlez de vous...',
    weight: 15
  },
  {
    key: 'work',
    label: 'Emploi',
    icon: <Briefcase className="h-4 w-4" />,
    type: 'text',
    placeholder: 'Ex: Développeur chez Google',
    weight: 10
  },
  {
    key: 'education',
    label: 'Formation',
    icon: <GraduationCap className="h-4 w-4" />,
    type: 'text',
    placeholder: 'Ex: Master en Informatique',
    weight: 10
  },
  {
    key: 'current_city',
    label: 'Ville actuelle',
    icon: <MapPin className="h-4 w-4" />,
    type: 'text',
    placeholder: 'Ex: Paris, France',
    weight: 8
  },
  {
    key: 'hometown',
    label: 'Ville natale',
    icon: <MapPin className="h-4 w-4" />,
    type: 'text',
    placeholder: 'Ex: Lyon, France',
    weight: 8
  },
  {
    key: 'relationship_status',
    label: 'Statut relationnel',
    icon: <Heart className="h-4 w-4" />,
    type: 'select',
    options: ['Célibataire', 'En couple', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)', 'Compliqué'],
    weight: 7
  },
  {
    key: 'birthdate',
    label: 'Date de naissance',
    icon: <Calendar className="h-4 w-4" />,
    type: 'date',
    weight: 7
  },
  {
    key: 'website',
    label: 'Site web',
    icon: <Globe className="h-4 w-4" />,
    type: 'text',
    placeholder: 'https://monsite.com',
    weight: 5
  },
  {
    key: 'phone',
    label: 'Téléphone',
    icon: <Phone className="h-4 w-4" />,
    type: 'text',
    placeholder: '+33 6 XX XX XX XX',
    weight: 5
  }
];

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { completeness, loading: completenessLoading, refresh } = useProfileCompleteness(user?.id);
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  useEffect(() => {
    if (user?.id && !completenessLoading) {
      fetchCurrentProfile();
    }
  }, [user?.id, completenessLoading]);

  const fetchCurrentProfile = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfileData(data);

        // Marquer les champs déjà remplis
        const filledFields = new Set<string>();
        profileFields.forEach(field => {
          if (data[field.key] && data[field.key].toString().trim() !== '') {
            filledFields.add(field.key);
          }
        });
        // Marquer les champs de couverture comme remplis
        if (data.cover_photo_url) {
          filledFields.add('cover_photo_url');
        }

        setCompletedFields(filledFields);
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error);
    }
  };

  const calculateProgress = () => {
    let totalWeight = 0;
    let completedWeight = 0;

    profileFields.forEach(field => {
      totalWeight += field.weight;
      // Vérifier en temps réel si le champ est rempli
      const value = profileData[field.key];
      if (value && typeof value === 'string' && value.trim() !== '') {
        completedWeight += field.weight;
      }
    });

    // Ajouter les points pour avatar et couverture
    if (profileData.avatar_url) {
      totalWeight += 20; // 20 points pour l'avatar
      completedWeight += 20;
    } else {
      totalWeight += 20;
    }

    if (profileData.cover_photo_url) {
      totalWeight += 15; // 15 points pour la couverture
      completedWeight += 15;
    } else {
      totalWeight += 15;
    }

    return totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;
  };

  const handleFieldUpdate = async (fieldKey: string, value: string) => {
    if (!user?.id || !value.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [fieldKey]: value.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setProfileData(prev => ({ ...prev, [fieldKey]: value.trim() }));
      setCompletedFields(prev => new Set(prev).add(fieldKey));

      // Actualiser la complétude
      await refresh();

      const newProgress = calculateProgress();
      if (newProgress >= 100) {
        setShowCongrats(true);
        setTimeout(async () => {
          // Invalider les queries avant la redirection pour s'assurer que la page profil se recharge correctement
          queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
          queryClient.invalidateQueries({ queryKey: ['profile-completeness', user.id] });
          navigate(`/profile/${user.id}`);
        }, 3000);
      }

      toast.success('Information enregistrée !');
    } catch (error) {
      console.error('Erreur mise à jour:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;

    try {
      console.log('🚀 === UPLOAD AVATAR - DÉBUT ===');
      console.log('📁 Image:', file.name, 'Size:', file.size, 'Type:', file.type);

      // MÊME LOGIQUE QUE LES UPLOADS DE CHAT QUI FONCTIONNENT
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('📤 Upload vers:', filePath);

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Upload échoué:', error);
        toast.error('Erreur lors du téléchargement de la photo');
        return;
      }

      console.log('✅ Upload réussi');

      // URL COMME LES AUTRES UPLOADS
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl;
      console.log('🎉 Avatar URL:', imageUrl);

      if (imageUrl) {
        await handleFieldUpdate('avatar_url', imageUrl);
      }

      console.log('🚀 === UPLOAD AVATAR - FIN ===');

    } catch (error) {
      console.error('💥 Erreur upload:', error);
      toast.error('Erreur lors du téléchargement de la photo');
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!user?.id) return;

    setIsUploadingCover(true);
    setCoverUploadProgress(0);

    let progressInterval: NodeJS.Timeout;

    try {
      console.log('🚀 === UPLOAD COUVERTURE - DÉBUT ===');
      console.log('📁 Fichier:', file.name, 'Size:', file.size, 'Type:', file.type);

      // Vérifier la taille du fichier
      const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024; // 50MB pour vidéos, 10MB pour images
      if (file.size > maxSize) {
        const type = file.type.startsWith('video/') ? 'vidéo' : 'photo';
        const maxSizeText = file.type.startsWith('video/') ? '50MB' : '10MB';
        toast.error(`La ${type} est trop volumineuse. Taille maximum: ${maxSizeText}`);
        setIsUploadingCover(false);
        return;
      }

      const isVideo = file.type.startsWith('video/');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}_cover.${fileExt}`;
      const filePath = `covers/${fileName}`;

      console.log('📤 Upload vers:', filePath);

      // Simuler la progression pour l'UX - plus lente pour les vidéos
      const progressStep = isVideo ? 8 : 12; // Progression plus lente pour vidéos
      progressInterval = setInterval(() => {
        setCoverUploadProgress(prev => {
          const newProgress = prev + (Math.random() * progressStep);
          return Math.min(newProgress, 75); // Max 75% pendant l'upload réel
        });
      }, isVideo ? 300 : 200); // Plus lent pour vidéos

      // Upload avec timeout plus long pour vidéos
      const uploadPromise = supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      // Timeout de 2 minutes pour vidéos, 30 secondes pour images
      const timeout = isVideo ? 120000 : 30000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Upload timeout')), timeout);
      });

      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      clearInterval(progressInterval);

      if (error) {
        console.error('❌ Upload échoué:', error);
        let errorMessage = 'Erreur lors du téléchargement';

        // Messages d'erreur plus spécifiques
        if (error.message?.includes('size') || error.message?.includes('too large')) {
          errorMessage = 'Fichier trop volumineux pour le serveur';
        } else if (error.message?.includes('type') || error.message?.includes('format')) {
          errorMessage = 'Format de fichier non supporté par le serveur';
        } else if (error.message?.includes('quota') || error.message?.includes('storage')) {
          errorMessage = 'Limite de stockage du serveur atteinte';
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'Téléchargement trop long, réessayez avec un fichier plus petit';
        }

        toast.error(errorMessage);
        setCoverUploadProgress(0);
        setIsUploadingCover(false);
        return;
      }

      setCoverUploadProgress(85);
      console.log('✅ Upload réussi');

      // Attendre un peu pour l'UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setCoverUploadProgress(90);

      // URL COMME LES AUTRES UPLOADS
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      const coverUrl = urlData.publicUrl;
      console.log('🎉 Couverture URL:', coverUrl);

      if (coverUrl) {
        setCoverUploadProgress(95);

        // Sauvegarder l'URL et le type de média
        const updateData: any = { cover_photo_url: coverUrl };
        if (isVideo) {
          updateData.cover_media_type = 'video';
        } else {
          updateData.cover_media_type = 'image';
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', user.id);

        if (updateError) {
          console.error('❌ Erreur sauvegarde DB:', updateError);
          throw updateError;
        }

        setProfileData(prev => ({ ...prev, ...updateData }));
        setCompletedFields(prev => new Set(prev).add('cover_photo_url'));

        // Actualiser la complétude
        await refresh();

        setCoverUploadProgress(100);

        const newProgress = calculateProgress();
        if (newProgress >= 100) {
          setShowCongrats(true);
          setTimeout(async () => {
            // Invalider les queries avant la redirection pour s'assurer que la page profil se recharge correctement
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
            queryClient.invalidateQueries({ queryKey: ['profile-completeness', user.id] });
            navigate(`/profile/${user.id}`);
          }, 3000);
        }

        toast.success('Couverture enregistrée avec succès !');

        // Reset progress after a delay
        setTimeout(() => {
          setCoverUploadProgress(0);
          setIsUploadingCover(false);
        }, 1500);
      }

      console.log('🚀 === UPLOAD COUVERTURE - FIN ===');

    } catch (error: any) {
      console.error('Erreur upload couverture:', error);

      // Nettoyer l'intervalle si elle existe
      if (progressInterval) {
        clearInterval(progressInterval);
      }

      let errorMessage = 'Une erreur inattendue s\'est produite';

      if (error.message?.includes('timeout')) {
        errorMessage = 'Téléchargement annulé (timeout). Le fichier est peut-être trop volumineux.';
      } else if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
      } else if (error.message?.includes('size') || error.message?.includes('large')) {
        errorMessage = 'Fichier trop volumineux pour le serveur.';
      } else if (error.message?.includes('quota') || error.message?.includes('storage')) {
        errorMessage = 'Limite de stockage du serveur atteinte.';
      } else if (error.message?.includes('auth') || error.code === 'UNAUTHORIZED') {
        errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.';
      } else if (error.message?.includes('permission') || error.code === 'FORBIDDEN') {
        errorMessage = 'Permissions insuffisantes pour cet upload.';
      }

      toast.error(errorMessage);
      setCoverUploadProgress(0);
      setIsUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!user?.id || !profileData.cover_photo_url) return;

    if (!confirm('Voulez-vous vraiment supprimer votre couverture ?')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          cover_photo_url: null,
          cover_media_type: null
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfileData(prev => ({
        ...prev,
        cover_photo_url: null,
        cover_media_type: null
      }));
      setCompletedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete('cover_photo_url');
        return newSet;
      });

      // Actualiser la complétude
      await refresh();

      toast.success('Couverture supprimée');
    } catch (error) {
      console.error('Erreur suppression couverture:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  if (showCongrats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Navbar />
        <Card className="w-full max-w-md mx-4 text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Félicitations ! 🎉
            </h2>
            <p className="text-gray-600 mb-6">
              Votre profil est maintenant complet ! Vous allez être redirigé vers votre profil.
            </p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Utiliser la même logique que useProfileCompleteness pour la synchronisation
  const progress = completeness ? completeness.score : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Complétez votre profil
          </h1>
          <p className="text-gray-600">
            Plus votre profil est complet, plus vous serez visible et pourrez interagir !
          </p>
        </div>

        {/* Progress Card */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Progression</h2>
              <span className="text-2xl font-bold text-blue-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3 mb-2" />
            <p className="text-sm text-gray-600">
              {completedFields.size} sur {profileFields.length} informations complétées
            </p>
          </CardContent>
        </Card>

        {/* Avatar Section */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo de profil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileData.avatar_url} />
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                    {user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {completedFields.has('avatar_url') && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Cliquez pour ajouter une photo de profil
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG ou GIF - Max 5MB
                    </p>
                  </div>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleAvatarUpload(file);
                    }}
                  />
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cover Section */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Photo ou vidéo de couverture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Barre de progression lors de l'upload */}
              {isUploadingCover && (
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ease-out rounded-full relative"
                    style={{ width: `${coverUploadProgress}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>
              )}

              {/* Aperçu de la couverture actuelle */}
              {profileData.cover_photo_url && (
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden group">
                  {profileData.cover_media_type === 'video' ? (
                    <video
                      src={profileData.cover_photo_url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={profileData.cover_photo_url}
                      alt="Couverture"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Overlay avec informations */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 group-hover:opacity-80 transition-opacity">
                    <div className="text-white text-center">
                      <h3 className="text-lg font-semibold mb-1">Couverture actuelle</h3>
                      <p className="text-sm opacity-90 mb-3">
                        {profileData.cover_media_type === 'video' ? 'Vidéo' : 'Photo'}
                      </p>

                      {/* Boutons d'action */}
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                          onClick={() => document.getElementById('cover-image-upload')?.click()}
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Changer
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="bg-red-500/80 hover:bg-red-600/80"
                          onClick={handleRemoveCover}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>

                  {completedFields.has('cover_photo_url') && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
              )}

              {/* Options d'upload - seulement si pas de couverture */}
              {!profileData.cover_photo_url && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Label htmlFor="cover-image-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <Camera className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Photo de couverture
                      </p>
                      <p className="text-xs text-gray-500">
                        JPG, PNG ou GIF - Max 10MB
                      </p>
                    </div>
                    <input
                      id="cover-image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCoverUpload(file);
                      }}
                    />
                  </Label>

                  <Label htmlFor="cover-video-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                      <div className="w-10 h-10 bg-gray-400 rounded mx-auto mb-3 flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-sm"></div>
                      </div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        Vidéo de couverture
                      </p>
                      <p className="text-xs text-gray-500">
                        MP4, WebM ou MOV - Max 50MB
                      </p>
                    </div>
                    <input
                      id="cover-video-upload"
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleCoverUpload(file);
                      }}
                    />
                  </Label>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">
                {profileData.cover_photo_url
                  ? "Survolez l'aperçu pour modifier ou supprimer votre couverture"
                  : "La couverture sera automatiquement recadrée et optimisée pour s'adapter parfaitement à votre profil"
                }
              </p>

              {/* Inputs cachés pour changement de couverture */}
              <input
                id="cover-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                }}
              />
              <input
                id="cover-video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCoverUpload(file);
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Profile Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profileFields.map((field) => {
            const isCompleted = completedFields.has(field.key);

            return (
              <Card
                key={field.key}
                className={`bg-white/80 backdrop-blur-sm border-0 shadow-lg transition-all ${
                  isCompleted ? 'ring-2 ring-green-200' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      {field.icon}
                      {field.label}
                      {isCompleted && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-500 font-normal">
                      +{field.weight}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {field.type === 'textarea' ? (
                    <Textarea
                      placeholder={field.placeholder}
                      value={profileData[field.key] || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== profileData[field.key]) {
                          handleFieldUpdate(field.key, e.target.value);
                        }
                      }}
                      className="min-h-[80px]"
                    />
                  ) : field.type === 'select' ? (
                    <Select
                      value={profileData[field.key] || ''}
                      onValueChange={(value) => {
                        setProfileData(prev => ({ ...prev, [field.key]: value }));
                        handleFieldUpdate(field.key, value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder || `Sélectionnez ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'date' ? (
                    <Input
                      type="date"
                      value={profileData[field.key] || ''}
                      onChange={(e) => {
                        setProfileData(prev => ({ ...prev, [field.key]: e.target.value }));
                        if (e.target.value) {
                          handleFieldUpdate(field.key, e.target.value);
                        }
                      }}
                    />
                  ) : (
                    <Input
                      type="text"
                      placeholder={field.placeholder}
                      value={profileData[field.key] || ''}
                      onChange={(e) => setProfileData(prev => ({ ...prev, [field.key]: e.target.value }))}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== profileData[field.key]) {
                          handleFieldUpdate(field.key, e.target.value);
                        }
                      }}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <Button
            size="lg"
            className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            onClick={async () => {
              setLoading(true);
              try {
                // Sauvegarder toutes les modifications en cours
                const updates: any = {};

                // Collecter tous les champs modifiés
                profileFields.forEach(field => {
                  const currentValue = profileData[field.key];
                  if (currentValue && currentValue.trim() !== '') {
                    updates[field.key] = currentValue.trim();
                  } else {
                    updates[field.key] = null; // Champs vides = null
                  }
                });

                console.log('💾 SAUVEGARDE FINALE:', updates);

                // Sauvegarder en base
                const { error } = await supabase
                  .from('profiles')
                  .update(updates)
                  .eq('id', user.id);

                if (error) throw error;

                // Actualiser la complétude
                await refresh();

                // Vérifier si maintenant complet
                const currentProgress = completeness ? completeness.score : 0;

                if (currentProgress >= 100) {
                  // Profil complet - montrer félicitations puis rediriger
                  setShowCongrats(true);
                  setTimeout(async () => {
                    // Invalider les queries avant la redirection pour s'assurer que la page profil se recharge correctement
                    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
                    queryClient.invalidateQueries({ queryKey: ['profile-completeness', user.id] });
                    navigate(`/profile/${user.id}`);
                  }, 3000);
                } else {
                  // Profil pas complet - rester sur la page
                  toast.success('Profil enregistré ! Vous pouvez continuer à le compléter.');
                }

              } catch (error) {
                console.error('Erreur sauvegarde finale:', error);
                toast.error('Erreur lors de la sauvegarde');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Enregistrement...
              </>
            ) : progress >= 100 ? (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Terminer mon profil
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 mr-2" />
                Enregistrer les modifications
              </>
            )}
          </Button>
        </div>

        {/* Completion Message */}
        {progress >= 80 && progress < 100 && (
          <Card className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  Excellent travail !
                </h3>
                <p className="text-green-700">
                  Votre profil est presque complet. Continuez à le remplir pour atteindre 100% !
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
