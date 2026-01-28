import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, Stack } from 'expo-router';

interface Order {
  id: string;
  created_at: string;
  status: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  };
}

export default function SellerOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      // Get shops owned by this user
      const { data: shops } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', session.user.id);

      if (!shops || shops.length === 0) {
        setLoading(false);
        return;
      }

      const shopIds = shops.map(s => s.id);

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          profiles:buyer_id (
            full_name,
            email
          )
        `)
        .in('shop_id', shopIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        setOrders(data as any[] || []);
      }
    } catch (e) {
      console.error('Unexpected error:', e);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested': return 'Fiyat Bekliyor';
      case 'offered': return 'Teklif Verildi';
      case 'approved': return 'Onaylandı';
      case 'shipped': return 'Kargolandı';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return 'text-orange-500';
      case 'offered': return 'text-blue-400';
      case 'approved': return 'text-green-500';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-navy justify-center items-center">
        <ActivityIndicator size="large" color="#d4af37" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-white/10 bg-navy">
        <TouchableOpacity onPress={() => router.back()} className="p-2 mr-2">
            <FontAwesome name="arrow-left" size={20} color="#d4af37" />
        </TouchableOpacity>
        <Text className="text-gold font-bold text-lg flex-1">Gelen Siparişler</Text>
      </View>

      {orders.length === 0 ? (
        <View className="flex-1 justify-center items-center px-6">
            <FontAwesome name="inbox" size={60} color="#d4af37" />
            <Text className="text-white text-lg font-bold mt-4">Henüz sipariş yok.</Text>
        </View>
      ) : (
        <FlatList
            data={orders}
            keyExtractor={(item) => item.id}
            refreshing={loading}
            onRefresh={fetchOrders}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
            <TouchableOpacity
                onPress={() => router.push(`/seller/orders/${item.id}`)}
                className="bg-white rounded-lg p-4 mb-4 border-l-4 border-gold shadow-sm"
            >
                <View className="flex-row justify-between mb-2">
                    <Text className="text-navy font-bold text-base">
                        {item.profiles?.full_name || 'Müşteri'}
                    </Text>
                    <Text className="text-gray-500 text-xs">
                        {new Date(item.created_at).toLocaleDateString()}
                    </Text>
                </View>
                <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600 text-sm">Sipariş #{item.id.slice(0, 8)}</Text>
                    <Text className={`font-bold text-sm ${getStatusColor(item.status)}`}>
                        {getStatusLabel(item.status)}
                    </Text>
                </View>
            </TouchableOpacity>
            )}
        />
      )}
    </SafeAreaView>
  );
}
