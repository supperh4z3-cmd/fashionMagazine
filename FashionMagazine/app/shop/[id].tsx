import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

import { MaterialIcons } from '@expo/vector-icons';

interface Shop {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  whatsapp_number: string | null;
  is_verified: boolean;
}

interface Product {
  id: string;
  images: string[];
  fabric_type: string | null;
  series_quantity: number;
  is_featured: boolean;
}

interface CartItem {
  productId: string;
  quantitySeries: number;
}

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  // Simple local cart for MVP
  const [cart, setCart] = useState<CartItem[]>([]);
  const [requesting, setRequesting] = useState(false);

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
        // Check ownership
        const { data: { session } } = await supabase.auth.getSession();
        if (session && shopData.owner_id === session.user.id) {
            setIsOwner(true);
        }
      }

      // Fetch Shop Products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, images, fabric_type, series_quantity, is_featured')
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
        router.push('/(tabs)/profile');
        return;
      }

      const { data: existingConv, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', session.user.id)
        .eq('shop_id', id)
        .single();

      if (existingConv) {
        router.push(`/messages/${existingConv.id}`);
      } else {
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

  const addToCart = (productId: string) => {
    setCart(current => {
      const existing = current.find(item => item.productId === productId);
      if (existing) {
        return current.map(item =>
          item.productId === productId
            ? { ...item, quantitySeries: item.quantitySeries + 1 }
            : item
        );
      }
      return [...current, { productId, quantitySeries: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(current => {
      const existing = current.find(item => item.productId === productId);
      if (existing && existing.quantitySeries > 1) {
        return current.map(item =>
          item.productId === productId
            ? { ...item, quantitySeries: item.quantitySeries - 1 }
            : item
        );
      }
      return current.filter(item => item.productId !== productId);
    });
  };

  const getCartQuantity = (productId: string) => {
    return cart.find(item => item.productId === productId)?.quantitySeries || 0;
  };

  const promoteProduct = async (productId: string) => {
    try {
        const { error } = await supabase
            .from('products')
            .update({ is_featured: true })
            .eq('id', productId);

        if (error) throw error;

        showToast("Ürün vitrine taşındı!", "success");
        // Refresh products locally
        setProducts(current =>
            current.map(p => p.id === productId ? { ...p, is_featured: true } : p)
        );
    } catch (e: any) {
        showToast("İşlem başarısız: " + e.message, "error");
    }
  };

  const submitRequest = async () => {
    if (cart.length === 0) return;
    setRequesting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert("Giriş Yapın", "Talep oluşturmak için giriş yapmalısınız.");
        router.push('/(tabs)/profile');
        return;
      }

      // 1. Create Order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          buyer_id: session.user.id,
          shop_id: id,
          status: 'requested',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create Order Items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.productId,
        quantity_series: item.quantitySeries,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      Alert.alert("Başarılı", "Fiyat teklifi talebiniz satıcıya iletildi.");
      setCart([]);

    } catch (e: any) {
      Alert.alert("Hata", "Talep oluşturulamadı: " + e.message);
    } finally {
      setRequesting(false);
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

  const shopName = shop.name || 'Mağaza';
  const shopLogo = shop.logo_url;
  const shopInitial = shopName.charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-4 py-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
            <FontAwesome name="arrow-left" size={20} color="#d4af37" />
        </TouchableOpacity>
        <Text className="text-gold font-bold text-lg ml-4 flex-1 text-center mr-8">{shopName}</Text>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Info */}
        <View className="items-center py-6 px-4 border-b border-gold/20">
            <View className="w-28 h-28 rounded-full border-2 border-gold overflow-hidden bg-white mb-4 justify-center items-center">
                <Image
                  source={shopLogo ? { uri: shopLogo } : null}
                  placeholder={blurhash}
                  contentFit="cover"
                  transition={500}
                  className="w-full h-full"
                />
                 {!shopLogo && <Text className="text-navy text-2xl font-bold">{shopInitial}</Text>}
            </View>
            <View className="flex-row items-center mb-2">
                <Text className="text-white text-xl font-bold mr-2">{shopName}</Text>
                {shop.is_verified && <MaterialIcons name="verified" size={20} color="#1DA1F2" />}
            </View>
            {shop.description && (
                <Text className="text-gray-300 text-center text-sm px-8 mb-4">{shop.description}</Text>
            )}

            <View className="flex-row mt-2 space-x-4 gap-4">
                 <TouchableOpacity onPress={handleMessagePress} className="border border-gold px-6 py-2 rounded-lg">
                    <Text className="text-gold font-bold">Mesaj At</Text>
                 </TouchableOpacity>
                 {shop.whatsapp_number && (
                    <TouchableOpacity onPress={handleWhatsAppPress} className="bg-green-600 px-6 py-2 rounded-lg flex-row items-center border border-green-700">
                        <FontAwesome name="whatsapp" size={18} color="white" className="mr-2" />
                        <Text className="text-white font-bold ml-2">WhatsApp</Text>
                    </TouchableOpacity>
                 )}
            </View>
        </View>

        {/* Products Grid */}
        <View className="p-4 pb-24">
             <View className="flex-row items-center justify-center mb-6 border-b border-white/10 pb-2">
                <FontAwesome name="th" size={16} color="#d4af37" className="mr-2" />
                <Text className="text-gold font-bold uppercase tracking-widest ml-2">ÜRÜNLER</Text>
             </View>

             <View className="flex-row flex-wrap justify-between">
                {products.map((product) => {
                    const qty = getCartQuantity(product.id);
                    const seriesQty = product.series_quantity || 4;

                    return (
                    <View key={product.id} className="w-[49%] mb-4 bg-white rounded-md overflow-hidden pb-2">
                         <View className="w-full h-48 bg-gray-200 relative">
                             <Image
                                source={product.images && product.images.length > 0 ? { uri: product.images[0] } : null}
                                placeholder={blurhash}
                                contentFit="cover"
                                transition={500}
                                className="w-full h-full"
                              />
                              {qty > 0 && (
                                <View className="absolute top-2 right-2 bg-gold px-2 py-1 rounded">
                                    <Text className="text-navy font-bold text-xs">{qty} Seri</Text>
                                </View>
                              )}
                              {product.is_featured && (
                                <View className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded">
                                    <Text className="text-white font-bold text-xs">Vitrin</Text>
                                </View>
                              )}
                         </View>

                         <View className="p-2">
                            <Text className="text-gray-600 text-xs mb-2 h-8" numberOfLines={2}>
                                {product.fabric_type || 'Ürün'}
                            </Text>

                            {isOwner && !product.is_featured ? (
                                <TouchableOpacity
                                    onPress={() => promoteProduct(product.id)}
                                    className="bg-gold py-2 rounded items-center mb-2"
                                >
                                    <Text className="text-navy font-bold text-xs">Bu Ürünü Vitrine Taşı</Text>
                                </TouchableOpacity>
                            ) : null}

                            {qty === 0 ? (
                                <TouchableOpacity
                                    onPress={() => addToCart(product.id)}
                                    className="bg-navy py-2 rounded items-center"
                                >
                                    <Text className="text-gold font-bold text-xs">Talep Listesine Ekle</Text>
                                </TouchableOpacity>
                            ) : (
                                <View className="flex-row items-center justify-between bg-gray-100 rounded p-1">
                                    <TouchableOpacity onPress={() => removeFromCart(product.id)} className="px-2">
                                        <FontAwesome name="minus" size={12} color="#001f3f" />
                                    </TouchableOpacity>
                                    <Text className="text-navy font-bold text-xs">
                                        {qty} Seri ({qty * seriesQty} Ad.)
                                    </Text>
                                    <TouchableOpacity onPress={() => addToCart(product.id)} className="px-2">
                                        <FontAwesome name="plus" size={12} color="#001f3f" />
                                    </TouchableOpacity>
                                </View>
                            )}
                         </View>
                    </View>
                )})}
             </View>

             {products.length === 0 && (
                 <Text className="text-gray-500 text-center py-10">Bu mağazada henüz ürün bulunmuyor.</Text>
             )}
        </View>
      </ScrollView>

      {/* Request Footer */}
      {cart.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-navy border-t border-gold p-4">
            <View className="flex-row justify-between items-center mb-2">
                <Text className="text-white font-bold">{cart.length} Ürün Seçildi</Text>
                <Text className="text-gold text-xs">Fiyat teklifi istenecek</Text>
            </View>
            <TouchableOpacity
                onPress={submitRequest}
                disabled={requesting}
                className="bg-gold w-full py-3 rounded-lg items-center"
            >
                {requesting ? (
                    <ActivityIndicator color="#001f3f" />
                ) : (
                    <Text className="text-navy font-bold text-lg">Talebi Gönder</Text>
                )}
            </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
