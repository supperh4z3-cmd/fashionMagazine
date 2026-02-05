import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import { useToast } from './ToastContext';

interface NotificationsContextType {
  notification: Notifications.Notification | null;
}

const NotificationsContext = createContext<NotificationsContextType>({ notification: null });

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
  const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Listener for foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listener for interaction (tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
    });

    // Supabase Realtime Listener for Messages
    const messageChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          // Check if the message is for me (receiver check)
          // Since we don't have 'receiver_id' in messages yet (added in next step migration),
          // we must query the conversation to see if I am the other participant.
          // OR, if we implemented the migration first, we could check payload.new.receiver_id.
          // Assuming migration will be applied:
          const newMessage = payload.new;
          const { data: { session } } = await supabase.auth.getSession();

          if (session && newMessage.sender_id !== session.user.id) {
             // It's an incoming message. Ideally check receiver_id here.
             // For now, let's assume if I'm authenticated, I might be the recipient.
             // Best practice: Fetch conversation to verify.

             const { data: conv } = await supabase
                .from('conversations')
                .select('buyer_id, shop_id') // We need to check if I am buyer or shop owner
                .eq('id', newMessage.conversation_id)
                .single();

             if (conv) {
                 let isRecipient = false;
                 if (conv.buyer_id === session.user.id) {
                     // I am buyer, message from shop (sender != me)
                     isRecipient = true;
                 } else {
                     // Check if I am shop owner
                     const { data: shop } = await supabase
                        .from('shops')
                        .select('owner_id')
                        .eq('id', conv.shop_id)
                        .single();
                     if (shop && shop.owner_id === session.user.id) {
                         isRecipient = true;
                     }
                 }

                 if (isRecipient) {
                     scheduleLocalNotification("Yeni Mesaj", newMessage.content.substring(0, 50));
                     showToast("Yeni mesajınız var!", "info");
                 }
             }
          }
        }
      )
      .subscribe();

    // Supabase Realtime Listener for Orders
    const orderChannel = supabase
      .channel('public:orders')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
            const updatedOrder = payload.new;
            const { data: { session } } = await supabase.auth.getSession();

            if (session) {
                // Check if I am the buyer
                if (updatedOrder.buyer_id === session.user.id) {
                    scheduleLocalNotification("Sipariş Güncellemesi", `Sipariş durumu: ${updatedOrder.status}`);
                    showToast(`Siparişiniz ${updatedOrder.status} durumuna geçti.`, "info");
                } else {
                    // Check if I am the seller (shop owner)
                     const { data: shop } = await supabase
                        .from('shops')
                        .select('owner_id')
                        .eq('id', updatedOrder.shop_id)
                        .single();

                     if (shop && shop.owner_id === session.user.id) {
                         scheduleLocalNotification("Sipariş Güncellemesi", `Sipariş durumu: ${updatedOrder.status}`);
                         showToast(`Sipariş durumu güncellendi: ${updatedOrder.status}`, "info");
                     }
                }
            }
        }
      )
      .subscribe();

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current!);
      Notifications.removeNotificationSubscription(responseListener.current!);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(orderChannel);
    };
  }, []);

  const scheduleLocalNotification = async (title: string, body: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger: null, // Show immediately
    });
  };

  return (
    <NotificationsContext.Provider value={{ notification }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return;
  }
}
