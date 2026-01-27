import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MapComponent() {
  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
        <View className="flex-1 justify-center items-center">
            <Text className="text-gold text-xl font-bold">Harita (Web'de Gösterilemiyor)</Text>
            <Text className="text-white mt-2">Lütfen mobil uygulamayı kullanın.</Text>
        </View>
    </SafeAreaView>
  );
}
