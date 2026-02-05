import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { translateText } from '../../lib/translate';
import i18n from '../../lib/i18n';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  translation: string | null;
  created_at: string;
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [recipientLang, setRecipientLang] = useState<string>('tr'); // Default
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });

    fetchMessages();
    fetchRecipientLanguage();

    // Subscribe to new messages
    const channel = supabase
      .channel(`room:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
  };

  const fetchRecipientLanguage = async () => {
    try {
        // 1. Get conversation to find the OTHER participant
        const { data: conv } = await supabase
            .from('conversations')
            .select('buyer_id, shop_id')
            .eq('id', id)
            .single();

        if (!conv) return;

        // Determine if I am buyer or shop (owner)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const myId = session.user.id;

        // If I am buyer, recipient is shop owner. If I am shop owner, recipient is buyer.
        // Wait, 'conversations' has 'shop_id', but 'profiles' has 'id'.
        // We need to get the user ID of the recipient.
        // If I am buyer (myId === conv.buyer_id), recipient is shop owner.
        // If I am not buyer, I must be shop owner (via 'shops' table), so recipient is buyer.

        let recipientUserId = conv.buyer_id;

        if (myId === conv.buyer_id) {
            // I am the buyer, so I need the shop owner's profile language.
            const { data: shop } = await supabase
                .from('shops')
                .select('owner_id')
                .eq('id', conv.shop_id)
                .single();
            if (shop) recipientUserId = shop.owner_id;
        }

        // 2. Fetch Recipient Profile Language
        const { data: profile } = await supabase
            .from('profiles')
            .select('language')
            .eq('id', recipientUserId)
            .single();

        if (profile && profile.language) {
            setRecipientLang(profile.language);
        }

    } catch (e) {
        console.error("Error fetching recipient language:", e);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return;
    setSending(true);

    try {
        const currentLang = i18n.language.split('-')[0]; // My App Language
        const targetLang = recipientLang; // Recipient's Saved Language

        let translatedContent = null;
        // Only translate if languages differ
        if (newMessage.trim() && currentLang !== targetLang) {
             translatedContent = await translateText(newMessage.trim(), currentLang, targetLang);
        }

        const { error } = await supabase
        .from('messages')
        .insert({
            conversation_id: id,
            sender_id: userId,
            content: newMessage.trim(),
            translation: translatedContent
        });

        if (error) {
            console.error('Error sending message:', error);
        } else {
            setNewMessage('');
        }
    } catch (e) {
        console.error("Send failed:", e);
    } finally {
        setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-white/10 bg-navy">
        <TouchableOpacity onPress={() => router.back()} className="p-2 mr-2">
            <FontAwesome name="arrow-left" size={20} color="#d4af37" />
        </TouchableOpacity>
        <Text className="text-gold font-bold text-lg flex-1">{i18n.t('chat')}</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        className="flex-1"
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 10 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMyMessage = item.sender_id === userId;
            return (
              <View
                className={`flex-row mb-2 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
              >
                <View
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    isMyMessage
                      ? 'bg-gold rounded-tr-none'
                      : 'bg-white rounded-tl-none'
                  }`}
                >
                  <Text className={`text-base ${isMyMessage ? 'text-navy font-medium' : 'text-gray-800'}`}>
                    {item.content}
                  </Text>
                  {item.translation && (
                      <Text className={`text-xs italic mt-1 ${isMyMessage ? 'text-navy/70' : 'text-gray-500'}`}>
                          {item.translation}
                      </Text>
                  )}
                  <Text className={`text-[10px] mt-1 text-right ${isMyMessage ? 'text-navy/60' : 'text-gray-500'}`}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Input Area */}
        <View className="p-4 bg-navy border-t border-white/10 flex-row items-center">
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={i18n.t('send') + "..."}
            placeholderTextColor="#999"
            multiline
            className="flex-1 bg-white/10 text-white p-3 rounded-full mr-3 border border-white/20 max-h-24"
          />
          <TouchableOpacity
            onPress={sendMessage}
            className={`w-12 h-12 rounded-full justify-center items-center ${
              newMessage.trim() && !sending ? 'bg-gold' : 'bg-gray-600'
            }`}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
                <ActivityIndicator color="#001f3f" size="small" />
            ) : (
                <FontAwesome name="send" size={18} color={newMessage.trim() ? '#001f3f' : '#ccc'} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
