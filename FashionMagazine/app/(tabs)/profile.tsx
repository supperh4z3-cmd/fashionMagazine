import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-navy">
      <ScrollView className="flex-1">
        <View className="items-center py-8 border-b border-gold/30">
          <View className="w-24 h-24 rounded-full bg-white border-2 border-gold mb-4 overflow-hidden">
             <Image source={{ uri: 'https://placehold.co/200x200/d4af37/001f3f/png?text=User' }} className="w-full h-full" />
          </View>
          <Text className="text-gold text-2xl font-bold">Kullanıcı Adı</Text>
          <Text className="text-gray-400 text-sm">Premium Üye</Text>
        </View>

        <View className="p-4">
          <TouchableOpacity className="flex-row items-center p-4 bg-navy-light mb-2 border border-white/10 rounded-lg">
            <FontAwesome name="heart" size={20} color="#d4af37" className="mr-4" />
            <Text className="text-white text-lg ml-4">Favorilerim</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4 bg-navy-light mb-2 border border-white/10 rounded-lg">
            <FontAwesome name="history" size={20} color="#d4af37" className="mr-4" />
            <Text className="text-white text-lg ml-4">Geçmiş Siparişler</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-row items-center p-4 bg-navy-light mb-2 border border-white/10 rounded-lg">
            <FontAwesome name="gear" size={20} color="#d4af37" className="mr-4" />
            <Text className="text-white text-lg ml-4">Ayarlar</Text>
          </TouchableOpacity>
           <TouchableOpacity className="flex-row items-center p-4 bg-navy-light mt-8 border border-red-900 rounded-lg">
            <FontAwesome name="sign-out" size={20} color="#ff4444" className="mr-4" />
            <Text className="text-red-500 text-lg ml-4">Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
