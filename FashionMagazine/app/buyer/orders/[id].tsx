import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { supabase } from '../../../lib/supabase';

interface OrderDetail {
  id: string;
  status: string;
  total_price: number | null;
  receipt_url: string | null;
}

interface OrderItem {
  id: string;
  quantity_series: number;
  agreed_price: number | null;
  products: {
    fabric_type: string | null;
    series_quantity: number;
  };
}

interface Extra {
  description: string;
  amount: number;
}

export default function BuyerOrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      // 1. Order Info
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, status, total_price, receipt_url')
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // 2. Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity_series,
          agreed_price,
          products (
            fabric_type,
            series_quantity
          )
        `)
        .eq('order_id', id);

      if (itemsError) throw itemsError;
      setItems(itemsData as any[] || []);

      // 3. Extras
      const { data: extrasData } = await supabase
        .from('order_extras')
        .select('*')
        .eq('order_id', id);

      setExtras(extrasData || []);

    } catch (e) {
      console.error('Error fetching details:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      Alert.alert("Başarılı", newStatus === 'approved' ? "Sipariş onaylandı." : "Sipariş reddedildi.");
      fetchOrderDetails();
    } catch (e: any) {
      Alert.alert("Hata", e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !order) {
    return (
      <SafeAreaView className="flex-1 bg-navy justify-center items-center">
        <ActivityIndicator size="large" color="#d4af37" />
      </SafeAreaView>
    );
  }

  const isOffered = order.status === 'offered';
  const isShipped = order.status === 'shipped';

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-4 py-3 flex-row items-center border-b border-white/10 bg-navy">
        <TouchableOpacity onPress={() => router.back()} className="p-2 mr-2">
            <FontAwesome name="arrow-left" size={20} color="#d4af37" />
        </TouchableOpacity>
        <Text className="text-gold font-bold text-lg flex-1">Sipariş Detayı</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Status Badge */}
        <View className="bg-white/10 p-4 rounded-lg mb-6 border border-gold/30 items-center">
            <Text className="text-gold font-bold uppercase tracking-widest">{order.status}</Text>
        </View>

        {/* Invoice Table */}
        <View className="bg-white rounded-lg overflow-hidden mb-6">
            <View className="flex-row bg-gray-100 p-3 border-b border-gray-200">
                <Text className="flex-1 font-bold text-xs text-navy">Ürün</Text>
                <Text className="w-16 font-bold text-xs text-center text-navy">Adet</Text>
                <Text className="w-20 font-bold text-xs text-right text-navy">Tutar</Text>
            </View>

            {items.map((item) => {
                const quantity = item.quantity_series * (item.products.series_quantity || 4);
                const lineTotal = quantity * (item.agreed_price || 0);

                return (
                    <View key={item.id} className="flex-row p-3 items-center border-b border-gray-100">
                        <View className="flex-1">
                            <Text className="text-sm text-gray-800 font-medium">
                                {item.products.fabric_type || 'Ürün'}
                            </Text>
                            <Text className="text-xs text-gray-500">
                                {item.quantity_series} Seri x {item.products.series_quantity}
                            </Text>
                        </View>
                        <Text className="w-16 text-center text-sm text-navy">{quantity}</Text>
                        <Text className="w-20 text-right text-sm font-bold text-navy">
                            {item.agreed_price ? `₺${lineTotal.toLocaleString()}` : '-'}
                        </Text>
                    </View>
                );
            })}

            {/* Extras */}
            {extras.map((extra, index) => (
                <View key={index} className="flex-row p-3 items-center bg-gray-50 border-b border-gray-100">
                    <Text className="flex-1 text-sm text-gray-600 italic">{extra.description}</Text>
                    <Text className="text-sm font-bold text-navy">₺{extra.amount.toLocaleString()}</Text>
                </View>
            ))}

            {/* Total */}
            <View className="p-4 bg-navy flex-row justify-between items-center">
                <Text className="text-gold font-bold text-lg">GENEL TOPLAM</Text>
                <Text className="text-gold font-bold text-xl">
                    {order.total_price ? `₺${order.total_price.toLocaleString()}` : 'Hesaplanıyor...'}
                </Text>
            </View>
        </View>

        {/* Actions for Shipped Orders */}
        {isShipped && order.receipt_url && (
            <TouchableOpacity
                onPress={() => setReceiptVisible(true)}
                className="bg-navy border border-gold p-4 rounded-lg flex-row justify-center items-center mb-6"
            >
                <FontAwesome name="file-image-o" size={24} color="#d4af37" className="mr-3" />
                <Text className="text-gold font-bold text-lg">Teslim Fişini Görüntüle</Text>
            </TouchableOpacity>
        )}

        {/* Modal for Receipt */}
        <Modal visible={receiptVisible} transparent={true} animationType="fade">
            <View className="flex-1 bg-black/90 justify-center items-center p-4">
                <TouchableOpacity
                    onPress={() => setReceiptVisible(false)}
                    className="absolute top-12 right-6 z-10 p-2"
                >
                    <FontAwesome name="close" size={30} color="white" />
                </TouchableOpacity>

                <Image
                    source={{ uri: order.receipt_url || '' }}
                    contentFit="contain"
                    className="w-full h-4/5 rounded-lg"
                />
            </View>
        </Modal>

      </ScrollView>

      {/* Footer Actions for Offered Orders */}
      {isOffered && (
        <View className="p-4 bg-white border-t border-gray-200 flex-row space-x-4 gap-4">
            <TouchableOpacity
                onPress={() => updateStatus('cancelled')}
                disabled={processing}
                className="flex-1 bg-red-100 py-4 rounded-lg items-center border border-red-200"
            >
                <Text className="text-red-700 font-bold">Reddet</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => updateStatus('approved')}
                disabled={processing}
                className="flex-1 bg-green-600 py-4 rounded-lg items-center shadow-md"
            >
                {processing ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white font-bold">Teklifi Onayla</Text>
                )}
            </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
