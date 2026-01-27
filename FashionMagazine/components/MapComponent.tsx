import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

const MERTER_REGION = {
  latitude: 41.016,
  longitude: 28.887,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const SHOPS = [
  { id: 1, title: 'Mağaza 1', description: 'Toptan Giyim', latitude: 41.0165, longitude: 28.8875 },
  { id: 2, title: 'Mağaza 2', description: 'Kumaşçılık', latitude: 41.0155, longitude: 28.8860 },
  { id: 3, title: 'Mağaza 3', description: 'Moda Evi', latitude: 41.0170, longitude: 28.8885 },
];

export default function MapComponent() {
  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <View className="flex-1">
        <MapView
          style={styles.map}
          initialRegion={MERTER_REGION}
        >
          <UrlTile
            urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

          {SHOPS.map((shop) => (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
              title={shop.title}
              description={shop.description}
            />
          ))}
        </MapView>

        <View className="absolute top-4 left-4 right-4 bg-navy/90 p-3 rounded-lg border border-gold">
          <Text className="text-gold font-bold text-center">MERTER TOPTANCI HARİTASI</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: Dimensions.get('window').width,
    height: '100%',
  },
});
