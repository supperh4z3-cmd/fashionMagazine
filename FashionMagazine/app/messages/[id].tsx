import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });

    fetchMessages();

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: userId,
        content: newMessage.trim(),
      });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
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
        <Text className="text-gold font-bold text-lg flex-1">Sohbet</Text>
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
            placeholder="Mesajınızı yazın..."
            placeholderTextColor="#999"
            multiline
            className="flex-1 bg-white/10 text-white p-3 rounded-full mr-3 border border-white/20 max-h-24"
          />
          <TouchableOpacity
            onPress={sendMessage}
            className={`w-12 h-12 rounded-full justify-center items-center ${
              newMessage.trim() ? 'bg-gold' : 'bg-gray-600'
            }`}
            disabled={!newMessage.trim()}
          >
            <FontAwesome name="send" size={18} color={newMessage.trim() ? '#001f3f' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
