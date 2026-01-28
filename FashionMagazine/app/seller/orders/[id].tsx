import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';

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
  amount: string; // Keep as string for input handling
}

export default function ManageOrderScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>('');

  // Shipping Form State
  const [cargoCompany, setCargoCompany] = useState('');
  const [trackingNo, setTrackingNo] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch Order Status first
      const { data: orderData } = await supabase.from('orders').select('status').eq('id', id).single();
      if (orderData) setOrderStatus(orderData.status);

      const { data: items, error } = await supabase
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

      if (error) throw error;
      setOrderItems(items as any[] || []);

      const { data: existingExtras } = await supabase
        .from('order_extras')
        .select('*')
        .eq('order_id', id);

      if (existingExtras) {
          setExtras(existingExtras.map(e => ({ description: e.description, amount: e.amount.toString() })));
      }

    } catch (e) {
      console.error('Error fetching order details:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateItemPrice = (itemId: string, price: string) => {
    setOrderItems(current =>
      current.map(item =>
        item.id === itemId ? { ...item, agreed_price: parseFloat(price) || 0 } : item
      )
    );
  };

  const addExtra = () => {
    setExtras([...extras, { description: '', amount: '' }]);
  };

  const updateExtra = (index: number, field: keyof Extra, value: string) => {
    const newExtras = [...extras];
    newExtras[index] = { ...newExtras[index], [field]: value };
    setExtras(newExtras);
  };

  const removeExtra = (index: number) => {
    setExtras(extras.filter((_, i) => i !== index));
  };

  // Calculations
  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => {
      const quantity = item.quantity_series * (item.products.series_quantity || 4);
      return sum + (quantity * (item.agreed_price || 0));
    }, 0);
  };

  const calculateExtrasTotal = () => {
    return extras.reduce((sum, extra) => sum + (parseFloat(extra.amount) || 0), 0);
  };

  const grandTotal = calculateSubtotal() + calculateExtrasTotal();

  const pickReceiptImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      // Store the base64 string directly in the state, prefixed with data URI for preview if needed,
      // but here we misuse the state slightly: we store the URI for preview, and the base64 in a separate way?
      // Since `receiptImage` is string | null, let's just store the base64 string if we use it for upload,
      // BUT `TextInput` or `Image` component needs a URI.
      // Better: Store the whole asset or just keep it simple: Use a ref or a separate state variable.
      // However, for this fix, I'll return the base64 from this function and handle it in the submit handler?
      // No, `pickReceiptImage` is called by onPress.
      // I will introduce a state `receiptBase64`.
      setReceiptImage(result.assets[0].uri);
      setReceiptBase64(result.assets[0].base64);
    }
  };

  const submitOffer = async () => {
    setSubmitting(true);
    try {
      // 1. Update Order Items
      for (const item of orderItems) {
        await supabase
          .from('order_items')
          .update({ agreed_price: item.agreed_price })
          .eq('id', item.id);
      }

      // 2. Manage Extras (Delete all and re-insert for simplicity)
      await supabase.from('order_extras').delete().eq('order_id', id);

      if (extras.length > 0) {
        await supabase.from('order_extras').insert(
            extras.map(e => ({
                order_id: id,
                description: e.description,
                amount: parseFloat(e.amount) || 0
            }))
        );
      }

      // 3. Update Order Status
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'offered',
          total_price: grandTotal
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert("Başarılı", "Teklif müşteriye gönderildi.");
      router.back();

    } catch (e: any) {
      Alert.alert("Hata", "Teklif gönderilemedi: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitShipment = async () => {
    if (!cargoCompany || !trackingNo) {
        Alert.alert("Eksik Bilgi", "Lütfen kargo bilgilerini giriniz.");
        return;
    }

    setSubmitting(true);
    try {
        let receiptUrl = null;

        if (receiptBase64) {
            const fileName = `receipt-${id}-${Date.now()}.jpg`;

            const { data, error } = await supabase.storage
                .from('order-receipts')
                .upload(fileName, decode(receiptBase64), {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (error) throw error;

            const { data: publicData } = supabase.storage
                .from('order-receipts')
                .getPublicUrl(fileName);

            receiptUrl = publicData.publicUrl;
        }

        const { error } = await supabase
            .from('orders')
            .update({
                status: 'shipped',
                receipt_url: receiptUrl,
                // In a real app, store cargoCompany/trackingNo in DB.
                // Adding to order_extras for now as a workaround or assume DB updated.
                // Or just update status as requested.
            })
            .eq('id', id);

        if (error) throw error;

        // Add tracking info as an extra note?
        // Or updated order table? User asked for "Kargo Formu", implies storage.
        // I will add an extra item for tracking info if no column exists.
        await supabase.from('order_extras').insert({
            order_id: id,
            description: `Kargo: ${cargoCompany} - Takip: ${trackingNo}`,
            amount: 0
        });

        Alert.alert("Başarılı", "Sipariş kargolandı.");
        router.back();

    } catch (e: any) {
        Alert.alert("Hata", "İşlem başarısız: " + e.message);
    } finally {
        setSubmitting(false);
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
        <Text className="text-gold font-bold text-lg flex-1">Teklif Hazırla</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 p-4">
            {/* Products Table */}
            <View className="bg-white rounded-lg overflow-hidden mb-6">
                <View className="flex-row bg-gray-100 p-2 border-b border-gray-200">
                    <Text className="flex-1 font-bold text-xs text-navy">Ürün</Text>
                    <Text className="w-16 font-bold text-xs text-center text-navy">Adet</Text>
                    <Text className="w-20 font-bold text-xs text-center text-navy">Birim Fiyat</Text>
                    <Text className="w-20 font-bold text-xs text-right text-navy">Toplam</Text>
                </View>

                {orderItems.map((item) => {
                    const quantity = item.quantity_series * (item.products.series_quantity || 4);
                    const lineTotal = quantity * (item.agreed_price || 0);

                    return (
                        <View key={item.id} className="flex-row p-2 items-center border-b border-gray-100">
                            <View className="flex-1">
                                <Text className="text-xs text-gray-800 font-medium" numberOfLines={2}>
                                    {item.products.fabric_type || 'Ürün'}
                                </Text>
                                <Text className="text-[10px] text-gray-500">
                                    {item.quantity_series} Seri
                                </Text>
                            </View>
                            <Text className="w-16 text-center text-xs font-bold text-navy">{quantity}</Text>
                            <View className="w-20 px-1">
                                <TextInput
                                    className="bg-gray-50 border border-gray-300 rounded px-1 py-1 text-center text-xs"
                                    placeholder="0"
                                    keyboardType="numeric"
                                    defaultValue={item.agreed_price?.toString()}
                                    onChangeText={(text) => updateItemPrice(item.id, text)}
                                />
                            </View>
                            <Text className="w-20 text-right text-xs font-bold text-navy">
                                ₺{lineTotal.toLocaleString()}
                            </Text>
                        </View>
                    );
                })}

                <View className="p-2 flex-row justify-between bg-gray-50">
                    <Text className="font-bold text-navy">Ara Toplam</Text>
                    <Text className="font-bold text-navy">₺{calculateSubtotal().toLocaleString()}</Text>
                </View>
            </View>

            {/* Extras Section */}
            <View className="bg-white rounded-lg p-4 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-navy font-bold text-base">Ekstralar / Hizmetler</Text>
                    <TouchableOpacity onPress={addExtra} className="bg-navy px-3 py-1 rounded">
                        <Text className="text-gold text-xs font-bold">+ Ekle</Text>
                    </TouchableOpacity>
                </View>

                {extras.map((extra, index) => (
                    <View key={index} className="flex-row mb-2 items-center space-x-2 gap-2">
                        <TextInput
                            className="flex-1 border border-gray-300 rounded p-2 text-xs"
                            placeholder="Açıklama (Örn: Kargo)"
                            value={extra.description}
                            onChangeText={(text) => updateExtra(index, 'description', text)}
                        />
                        <TextInput
                            className="w-24 border border-gray-300 rounded p-2 text-xs text-right"
                            placeholder="Tutar"
                            keyboardType="numeric"
                            value={extra.amount}
                            onChangeText={(text) => updateExtra(index, 'amount', text)}
                        />
                        <TouchableOpacity onPress={() => removeExtra(index)} className="p-1">
                            <FontAwesome name="trash" size={16} color="red" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* Summary */}
            <View className="bg-navy border border-gold rounded-lg p-4 mb-8">
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-300">Ürünler Toplamı</Text>
                    <Text className="text-white">₺{calculateSubtotal().toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-300">Ekstralar</Text>
                    <Text className="text-white">₺{calculateExtrasTotal().toLocaleString()}</Text>
                </View>
                <View className="h-[1px] bg-gold/50 my-2" />
                <View className="flex-row justify-between">
                    <Text className="text-gold font-bold text-xl">GENEL TOPLAM</Text>
                    <Text className="text-gold font-bold text-xl">₺{grandTotal.toLocaleString()}</Text>
                </View>
            </View>
        </ScrollView>

        {/* Footer Action */}
        <View className="p-4 bg-white border-t border-gray-200">
            {orderStatus === 'requested' && (
                <TouchableOpacity
                    onPress={submitOffer}
                    disabled={submitting}
                    className="bg-navy py-4 rounded-lg items-center shadow-lg"
                >
                    {submitting ? (
                        <ActivityIndicator color="#d4af37" />
                    ) : (
                        <Text className="text-gold font-bold text-lg">Teklifi Gönder / Onaya Sun</Text>
                    )}
                </TouchableOpacity>
            )}

            {orderStatus === 'approved' && (
                <View>
                    <Text className="text-navy font-bold mb-2">Kargo Bilgileri</Text>
                    <TextInput
                        className="border border-gray-300 rounded p-2 mb-2"
                        placeholder="Kargo Firması"
                        value={cargoCompany}
                        onChangeText={setCargoCompany}
                    />
                    <TextInput
                        className="border border-gray-300 rounded p-2 mb-2"
                        placeholder="Takip No"
                        value={trackingNo}
                        onChangeText={setTrackingNo}
                    />

                    <TouchableOpacity onPress={pickReceiptImage} className="bg-gray-200 p-3 rounded items-center mb-4">
                        <Text className="text-navy font-medium">
                            {receiptImage ? 'Fiş Seçildi (Değiştir)' : 'Teslim Fişi / Ambar Fişi Yükle'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={submitShipment}
                        disabled={submitting}
                        className="bg-green-600 py-4 rounded-lg items-center shadow-lg"
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white font-bold text-lg">Kargolandı / Tamamla</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            {['offered', 'shipped'].includes(orderStatus) && (
                <View className="bg-gray-100 p-4 rounded items-center">
                    <Text className="text-gray-500 font-bold uppercase">{orderStatus === 'offered' ? 'Müşteri Onayı Bekleniyor' : 'Sipariş Tamamlandı'}</Text>
                </View>
            )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
