import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WonderPush API credentials
const WONDERPUSH_CLIENT_ID = Deno.env.get('WONDERPUSH_CLIENT_ID') || '';
const WONDERPUSH_CLIENT_SECRET = Deno.env.get('WONDERPUSH_CLIENT_SECRET') || '';
const WONDERPUSH_API_URL = 'https://management-api.wonderpush.com/v1';

interface NotificationPayload {
  user_ids: string[]; // Users to notify
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

async function sendWonderPushNotification(
  installationIds: string[],
  payload: {
    title: string;
    body: string;
    icon?: string;
    data?: Record<string, any>;
  }
): Promise<boolean> {
  try {
    const auth = btoa(`${WONDERPUSH_CLIENT_ID}:${WONDERPUSH_CLIENT_SECRET}`);
    
    const notification = {
      targetInstallationIds: installationIds,
      notification: {
        alert: {
          title: payload.title,
          text: payload.body,
        },
        ios: {
          badge: 'auto',
        },
        android: {
          icon: payload.icon || 'ic_notification',
        },
      },
      data: payload.data,
    };

    const response = await fetch(`${WONDERPUSH_API_URL}/deliveries`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WonderPush API error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending WonderPush notification:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: NotificationPayload = await req.json();
    const { user_ids, title, body, icon, badge, data } = payload;

    console.log(`Sending push notifications to ${user_ids.length} users`);

    // Get all subscriptions (installation IDs) for the target users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .in('user_id', user_ids);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for these users');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract installation IDs
    const installationIds = subscriptions.map(sub => sub.endpoint);

    // Send notification via WonderPush
    const success = await sendWonderPushNotification(installationIds, {
      title,
      body,
      icon: icon || '/icon-192.png',
      data: {
        url: '/',
        ...data,
      },
    });

    console.log(`WonderPush notification ${success ? 'sent successfully' : 'failed'} to ${installationIds.length} installations`);

    return new Response(
      JSON.stringify({
        success,
        sent: success ? installationIds.length : 0,
        total: installationIds.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
