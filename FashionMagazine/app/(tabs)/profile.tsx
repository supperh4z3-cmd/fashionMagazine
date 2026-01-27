import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Image } from 'expo-image';
import i18n, { changeLanguage } from '../../lib/i18n';
import { useTranslation } from 'react-i18next';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');

  const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

  useEffect(() => {
    setLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              avatar_url: `https://ui-avatars.com/api/?name=${fullName}&background=d4af37&color=001f3f`,
            },
          },
        });
        if (error) throw error;
        Alert.alert('Kayıt Başarılı', 'Lütfen giriş yapınız.');
        setIsLogin(true);
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-navy justify-center items-center">
        <ActivityIndicator size="large" color="#d4af37" />
      </SafeAreaView>
    );
  }

  if (session) {
    const user = session.user;
    const avatarUrl = user.user_metadata?.avatar_url;
    const userName = user.user_metadata?.full_name || user.email;

    return (
      <SafeAreaView className="flex-1 bg-navy">
        <ScrollView className="flex-1">
          <View className="items-center py-8 border-b border-gold/30">
            <View className="w-24 h-24 rounded-full border-2 border-gold mb-4 overflow-hidden bg-white justify-center items-center">
               <Image
                  source={avatarUrl ? { uri: avatarUrl } : null}
                  placeholder={blurhash}
                  contentFit="cover"
                  className="w-full h-full"
                />
                {!avatarUrl && <FontAwesome name="user" size={40} color="#001f3f" />}
            </View>
            <Text className="text-gold text-2xl font-bold">{userName}</Text>
            <Text className="text-gray-400 text-sm">{user.email}</Text>
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

            <View className="mb-4 mt-2">
                <Text className="text-gold font-bold mb-2 ml-1">{t('change_language')}</Text>
                <View className="flex-row justify-between">
                    {['tr', 'en', 'ar'].map((lang) => (
                        <TouchableOpacity
                            key={lang}
                            onPress={() => changeLanguage(lang)}
                            className={`flex-1 mx-1 py-2 rounded border ${
                                i18n.language.startsWith(lang)
                                ? 'bg-gold border-gold'
                                : 'bg-transparent border-white/30'
                            }`}
                        >
                            <Text className={`text-center font-bold uppercase ${
                                i18n.language.startsWith(lang) ? 'text-navy' : 'text-white'
                            }`}>
                                {lang}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <TouchableOpacity
              onPress={handleSignOut}
              className="flex-row items-center p-4 bg-navy-light mt-8 border border-red-900 rounded-lg"
            >
              <FontAwesome name="sign-out" size={20} color="#ff4444" className="mr-4" />
              <Text className="text-red-500 text-lg ml-4">Çıkış Yap</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-navy justify-center px-6">
      <View className="items-center mb-8">
        <Text className="text-gold text-3xl font-bold tracking-widest">FASHION</Text>
        <Text className="text-white text-xs tracking-[5px] mt-1">MAGAZINE</Text>
      </View>

      <View className="bg-white/5 p-6 rounded-2xl border border-gold/30">
        <Text className="text-white text-xl font-bold mb-6 text-center">
          {isLogin ? t('login') : t('register')}
        </Text>

        {!isLogin && (
          <View className="mb-4">
            <Text className="text-gold mb-2 font-medium">Ad Soyad</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Adınız Soyadınız"
              placeholderTextColor="#666"
              className="bg-white text-navy p-3 rounded-lg border border-gold"
            />
          </View>
        )}

        <View className="mb-4">
          <Text className="text-gold mb-2 font-medium">E-posta</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@email.com"
            placeholderTextColor="#666"
            autoCapitalize="none"
            className="bg-white text-navy p-3 rounded-lg border border-gold"
          />
        </View>

        <View className="mb-6">
          <Text className="text-gold mb-2 font-medium">Şifre</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="******"
            placeholderTextColor="#666"
            secureTextEntry
            className="bg-white text-navy p-3 rounded-lg border border-gold"
          />
        </View>

        <TouchableOpacity
          onPress={handleAuth}
          disabled={loading}
          className="bg-gold p-4 rounded-lg items-center mb-4"
        >
          {loading ? (
            <ActivityIndicator color="#001f3f" />
          ) : (
            <Text className="text-navy font-bold text-lg">
              {isLogin ? t('login') : t('register')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)} className="items-center">
          <Text className="text-gray-400">
            {isLogin ? "Hesabınız yok mu? " : "Zaten hesabınız var mı? "}
            <Text className="text-gold font-bold">
              {isLogin ? t('register') : t('login')}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
