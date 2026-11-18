import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, useTheme } from '@/lib/theme';

function NotchHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerWrap, { backgroundColor: colors.bg }]}>
      <View
        style={[
          styles.notch,
          {
            backgroundColor: colors.primary,
            paddingTop: insets.top + 14,
          },
        ]}
      >
        <Text style={styles.notchTitle} numberOfLines={1}>
          {title}
        </Text>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: font.semibold,
          fontSize: 10,
        },
        header: ({ options }) => <NotchHeader title={options.title ?? ''} />,
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'heart' : 'heart-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="outings"
        options={{
          title: 'Salidas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: 'Películas',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'film' : 'film-outline'} size={22} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Cocina',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Cuenta',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    width: '100%',
  },
  notch: {
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 18,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notchTitle: {
    fontFamily: font.bold,
    fontSize: 20,
    color: '#FFFFFF',
  },
});
