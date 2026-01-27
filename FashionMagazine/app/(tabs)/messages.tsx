import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

interface Conversation {
  id: string;
  created_at: string;
  shop_id: string;
  shops: {
    name: string;
    logo_url: string | null;
  };
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          created_at,
          shop_id,
          shops (
            name,
            logo_url
          )
        `)
        .eq('buyer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
      } else {
        setConversations(data as any[] || []);
      }
    } catch (e) {
      console.error('Unexpected error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationPress = (id: string) => {
    router.push(`/messages/${id}`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-navy justify-center items-center">
        <ActivityIndicator size="large" color="#d4af37" />
      </SafeAreaView>
    );
  }

  if (conversations.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-navy justify-center items-center px-6">
        <View className="items-center py-6 px-4">
            <FontAwesome name="envelope-o" size={60} color="#d4af37" />
            <Text className="text-white text-lg font-bold mt-4">Henüz mesajınız yok.</Text>
            <Text className="text-gray-400 text-center mt-2">Mağazalarla iletişime geçmek için vitrin sayfasına göz atın.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy">
      <View className="p-4 border-b border-gold/30">
        <Text className="text-gold text-2xl font-bold">Mesajlar</Text>
      </View>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={fetchConversations}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleConversationPress(item.id)}
            className="flex-row items-center p-4 border-b border-white/10 bg-navy"
          >
            <View className="w-12 h-12 rounded-full bg-white border border-gold justify-center items-center mr-4 overflow-hidden">
               {item.shops.logo_url ? (
                  <Image
                    source={{ uri: item.shops.logo_url }}
                    contentFit="cover"
                    className="w-full h-full"
                  />
               ) : (
                  <Text className="text-navy font-bold text-lg">{item.shops.name.charAt(0)}</Text>
               )}
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between mb-1">
                <Text className="text-white font-bold text-base">{item.shops.name}</Text>
                <Text className="text-gray-400 text-xs">
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text className="text-gray-300 text-sm" numberOfLines={1}>Sohbeti görüntülemek için dokunun...</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
