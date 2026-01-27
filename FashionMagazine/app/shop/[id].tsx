import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

interface Shop {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  whatsapp_number: string | null;
}

interface Product {
  id: string;
  images: string[];
  fabric_type: string | null;
  price: number | null;
  is_price_visible: boolean;
}

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

  useEffect(() => {
    if (id) {
      fetchShopDetails();
    }
  }, [id]);

  const fetchShopDetails = async () => {
    setLoading(true);
    try {
      // Fetch Shop Data
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', id)
        .single();

      if (shopError) {
        console.error('Error fetching shop:', shopError);
      } else {
        setShop(shopData);
      }

      // Fetch Shop Products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, images, fabric_type, price, is_price_visible')
        .eq('shop_id', id);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      } else {
        setProducts(productsData || []);
      }

    } catch (e) {
      console.error('Unexpected error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppPress = () => {
    if (shop?.whatsapp_number) {
      // Remove all non-numeric characters from the phone number
      const cleanNumber = shop.whatsapp_number.replace(/\D/g, '');
      const url = `https://wa.me/${cleanNumber}`;
      Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
    }
  };

  const handleMessagePress = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in, redirect to profile
        router.push('/(tabs)/profile');
        return;
      }

      // Check for existing conversation
      const { data: existingConv, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', session.user.id)
        .eq('shop_id', id)
        .single();

      if (existingConv) {
        // Navigate to existing conversation
        router.push(`/messages/${existingConv.id}`);
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            buyer_id: session.user.id,
            shop_id: id,
          })
          .select()
          .single();

        if (createError) throw createError;
        if (newConv) {
          router.push(`/messages/${newConv.id}`);
        }
      }

    } catch (e) {
      console.error('Error handling message:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-navy justify-center items-center">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#d4af37" />
        <Text className="text-gold mt-4">Mağaza Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (!shop) {
    return (
       <SafeAreaView className="flex-1 bg-navy justify-center items-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-white">Mağaza bulunamadı.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-gold px-4 py-2 rounded">
             <Text className="text-navy font-bold">Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header with Back Button */}
      <View className="px-4 py-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
            <FontAwesome name="arrow-left" size={20} color="#d4af37" />
        </TouchableOpacity>
        <Text className="text-gold font-bold text-lg ml-4 flex-1 text-center mr-8">{shop.name}</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Header */}
        <View className="items-center py-6 px-4 border-b border-gold/20">
            <View className="w-28 h-28 rounded-full border-2 border-gold overflow-hidden bg-white mb-4 justify-center items-center">
                <Image
                  source={shop.logo_url ? { uri: shop.logo_url } : null}
                  placeholder={blurhash}
                  contentFit="cover"
                  transition={500}
                  className="w-full h-full"
                />
                 {!shop.logo_url && <Text className="text-navy text-2xl font-bold">{shop.name.charAt(0)}</Text>}
            </View>

            <Text className="text-white text-xl font-bold mb-2">{shop.name}</Text>
            {shop.description && (
                <Text className="text-gray-300 text-center text-sm px-8 mb-4">{shop.description}</Text>
            )}

            {/* Actions */}
            <View className="flex-row mt-2 space-x-4 gap-4">
                 <TouchableOpacity
                    onPress={handleMessagePress}
                    className="border border-gold px-6 py-2 rounded-lg"
                 >
                    <Text className="text-gold font-bold">Mesaj At</Text>
                 </TouchableOpacity>

                 {shop.whatsapp_number && (
                    <TouchableOpacity
                        onPress={handleWhatsAppPress}
                        className="bg-green-600 px-6 py-2 rounded-lg flex-row items-center border border-green-700"
                    >
                        <FontAwesome name="whatsapp" size={18} color="white" className="mr-2" />
                        <Text className="text-white font-bold ml-2">WhatsApp</Text>
                    </TouchableOpacity>
                 )}
            </View>
        </View>

        {/* Products Grid */}
        <View className="p-4">
             <View className="flex-row items-center justify-center mb-6 border-b border-white/10 pb-2">
                <FontAwesome name="th" size={16} color="#d4af37" className="mr-2" />
                <Text className="text-gold font-bold uppercase tracking-widest ml-2">ÜRÜNLER</Text>
             </View>

             <View className="flex-row flex-wrap justify-between">
                {products.map((product) => (
                    <TouchableOpacity
                        key={product.id}
                        className="w-[49%] mb-4 bg-white rounded-md overflow-hidden"
                    >
                         <View className="w-full h-48 bg-gray-200">
                             <Image
                                source={product.images && product.images.length > 0 ? { uri: product.images[0] } : null}
                                placeholder={blurhash}
                                contentFit="cover"
                                transition={500}
                                className="w-full h-full"
                              />
                         </View>
                         {/* Minimal Info for Grid */}
                         <View className="p-2 bg-navy border-t border-gold/50">
                            {product.is_price_visible && product.price ? (
                                <Text className="text-gold font-bold text-center">₺{product.price}</Text>
                            ) : (
                                <Text className="text-gold text-xs text-center">Fiyat Sorunuz</Text>
                            )}
                         </View>
                    </TouchableOpacity>
                ))}
             </View>

             {products.length === 0 && (
                 <Text className="text-gray-500 text-center py-10">Bu mağazada henüz ürün bulunmuyor.</Text>
             )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
