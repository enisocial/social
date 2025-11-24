import { supabase } from '@/integrations/supabase/client';

export interface SendNotificationParams {
  userIds: string[];
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, any>;
}

export const sendPushNotification = async ({
  userIds,
  title,
  body,
  icon,
  data,
}: SendNotificationParams): Promise<boolean> => {
  try {
    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_ids: userIds,
        title,
        body,
        icon,
        data,
      },
    });

    if (error) {
      console.error('Error sending push notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error invoking push notification function:', error);
    return false;
  }
};

// Helper functions for common notification types
export const notifyNewMessage = async (recipientId: string, senderName: string) => {
  await sendPushNotification({
    userIds: [recipientId],
    title: 'Nouveau message',
    body: `${senderName} vous a envoyé un message`,
    data: { type: 'message', url: '/messages' },
  });
};

export const notifyNewLike = async (postOwnerId: string, likerName: string) => {
  await sendPushNotification({
    userIds: [postOwnerId],
    title: 'Nouveau like',
    body: `${likerName} a aimé votre publication`,
    data: { type: 'like', url: '/feed' },
  });
};

export const notifyNewComment = async (
  postOwnerId: string,
  commenterName: string,
  postId: string
) => {
  await sendPushNotification({
    userIds: [postOwnerId],
    title: 'Nouveau commentaire',
    body: `${commenterName} a commenté votre publication`,
    data: { type: 'comment', url: `/post/${postId}` },
  });
};

export const notifyNewFriendRequest = async (receiverId: string, senderName: string) => {
  await sendPushNotification({
    userIds: [receiverId],
    title: 'Nouvelle demande d\'ami',
    body: `${senderName} vous a envoyé une demande d\'ami`,
    data: { type: 'friend_request', url: '/friends' },
  });
};
