import { View, Text, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRODUCTS = [
  { id: 1, name: 'Lüks İpek Şal', price: '₺2,500', image: 'https://placehold.co/300x300/d4af37/001f3f/png?text=Silk+Scarf' },
  { id: 2, name: 'Altın İşlemeli Elbise', price: '₺15,000', image: 'https://placehold.co/300x400/d4af37/001f3f/png?text=Gold+Dress' },
  { id: 3, name: 'Deri Çanta', price: '₺8,750', image: 'https://placehold.co/300x300/d4af37/001f3f/png?text=Leather+Bag' },
  { id: 4, name: 'Özel Tasarım Ceket', price: '₺12,000', image: 'https://placehold.co/300x400/d4af37/001f3f/png?text=Designer+Jacket' },
];

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-navy">
      <ScrollView className="flex-1 px-4">
        <View className="py-6 items-center">
          <Text className="text-gold text-3xl font-bold tracking-widest">FASHION</Text>
          <Text className="text-white text-xs tracking-[5px] mt-1">MAGAZINE</Text>
        </View>

        <View className="flex-row flex-wrap justify-between pb-20">
          {PRODUCTS.map((product) => (
            <TouchableOpacity key={product.id} className="w-[48%] mb-6 bg-white rounded-lg overflow-hidden border border-gold shadow-lg">
              <Image source={{ uri: product.image }} className="w-full h-48" resizeMode="cover" />
              <View className="p-3">
                <Text className="text-navy font-semibold text-sm mb-1">{product.name}</Text>
                <Text className="text-gold font-bold text-lg">{product.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
