import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, UrlTile, Callout } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const MERTER_REGION = {
  latitude: 41.016,
  longitude: 28.895,
  latitudeDelta: 0.015,
  longitudeDelta: 0.015,
};

interface Shop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  logo_url: string | null;
  is_verified: boolean;
}

export default function MapComponent() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('id, name, latitude, longitude, logo_url, is_verified');

    if (error) {
      console.error('Error fetching shops for map:', error);
    } else {
      setShops(data || []);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-navy" edges={['top']}>
      <View className="flex-1">
        <MapView
          style={styles.map}
          initialRegion={MERTER_REGION}
        >
          {/* OpenStreetMap Tile Layer */}
          <UrlTile
            urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />

          {shops.map((shop) => (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
            >
              <View style={styles.markerContainer}>
                {shop.logo_url ? (
                  <Image
                    source={{ uri: shop.logo_url }}
                    style={styles.markerImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.markerImage, styles.defaultMarker]}>
                    <Text style={styles.markerText}>{shop.name.charAt(0)}</Text>
                  </View>
                )}
              </View>
              <Callout onPress={() => router.push(`/shop/${shop.id}`)}>
                <View style={styles.callout}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.calloutText}>{shop.name}</Text>
                    {shop.is_verified && <MaterialIcons name="verified" size={14} color="#1DA1F2" style={{ marginLeft: 2 }} />}
                  </View>
                </View>
              </Callout>
            </Marker>
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
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#d4af37', // Gold border
    backgroundColor: 'white',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerImage: {
    width: '100%',
    height: '100%',
  },
  defaultMarker: {
    backgroundColor: '#001f3f', // Navy background for default
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    color: '#d4af37', // Gold text
    fontWeight: 'bold',
  },
  callout: {
    padding: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  calloutText: {
    fontWeight: 'bold',
    color: '#001f3f',
  },
});
