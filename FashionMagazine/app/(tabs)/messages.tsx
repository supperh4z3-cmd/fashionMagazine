import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';

const MESSAGES = [
  { id: '1', sender: 'Butik Sahibi', preview: 'Yeni sezon ürünleriniz ne zaman gelecek?', time: '10:30' },
  { id: '2', sender: 'Tedarikçi Ahmet', preview: 'Kumaş numuneleri kargoya verildi.', time: 'Dün' },
  { id: '3', sender: 'Müşteri Hizmetleri', preview: 'Talebiniz alınmıştır, teşekkürler.', time: 'Paz' },
];

export default function MessagesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-navy">
      <View className="p-4 border-b border-gold/30">
        <Text className="text-gold text-2xl font-bold">Mesajlar</Text>
      </View>
      <FlatList
        data={MESSAGES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity className="flex-row items-center p-4 border-b border-white/10 bg-navy">
            <View className="w-12 h-12 rounded-full bg-gold justify-center items-center mr-4">
              <FontAwesome name="user" size={20} color="#001f3f" />
            </View>
            <View className="flex-1">
              <View className="flex-row justify-between mb-1">
                <Text className="text-white font-bold text-base">{item.sender}</Text>
                <Text className="text-gray-400 text-xs">{item.time}</Text>
              </View>
              <Text className="text-gray-300 text-sm" numberOfLines={1}>{item.preview}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
