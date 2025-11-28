import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const TestUpload: React.FC = () => {
  const { user } = useAuth();
  const [buckets, setBuckets] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const checkBuckets = async () => {
    console.log('🔍 Vérification des buckets...');
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        console.error('❌ Erreur buckets:', error);
        setTestResult(`❌ Erreur: ${error.message}`);
        return;
      }
      console.log('📋 Buckets trouvés:', data);
      setBuckets(data || []);
      setTestResult(`✅ ${data?.length || 0} buckets trouvés`);
    } catch (error) {
      console.error('💥 Erreur:', error);
      setTestResult(`💥 Erreur: ${error}`);
    }
  };

  const testUpload = async () => {
    if (!user?.id) {
      setTestResult('❌ Pas d\'utilisateur connecté');
      return;
    }

    setUploading(true);
    console.log('🚀 Test upload image...');

    try {
      // Créer un fichier de test
      const testFile = new File(['Hello World'], 'test.txt', { type: 'text/plain' });
      const fileName = `test_${Date.now()}.txt`;
      const filePath = `chat/${fileName}`;

      console.log('📤 Upload vers:', filePath);

      const { data, error } = await supabase.storage
        .from('media')
        .upload(filePath, testFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Upload échoué:', error);
        setTestResult(`❌ Upload échoué: ${error.message}`);
        return;
      }

      console.log('✅ Upload réussi:', data);

      // Test URL
      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      console.log('🎉 URL générée:', urlData.publicUrl);
      setTestResult(`✅ Upload réussi! URL: ${urlData.publicUrl}`);

    } catch (error) {
      console.error('💥 Erreur upload:', error);
      setTestResult(`💥 Erreur: ${error}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Test Upload Système</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Button onClick={checkBuckets} className="w-full">
            🔍 Vérifier Buckets
          </Button>

          {buckets.length > 0 && (
            <div className="text-sm">
              <p className="font-medium">Buckets trouvés:</p>
              {buckets.map((bucket) => (
                <p key={bucket.name} className="text-muted-foreground">
                  • {bucket.name} ({bucket.public ? 'public' : 'private'})
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button onClick={testUpload} disabled={uploading} className="w-full">
            {uploading ? '⏳ Upload en cours...' : '📤 Tester Upload'}
          </Button>
        </div>

        {testResult && (
          <div className="p-3 bg-muted rounded text-sm whitespace-pre-wrap">
            {testResult}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p><strong>User ID:</strong> {user?.id || 'Non connecté'}</p>
          <p><strong>Status:</strong> {user ? 'Connecté' : 'Déconnecté'}</p>
        </div>
      </CardContent>
    </Card>
  );
};
