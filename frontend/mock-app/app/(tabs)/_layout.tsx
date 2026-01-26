import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Compass, Vault, Clock } from 'lucide-react-native';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false, // Always hide labels globally
        tabBarActiveTintColor: isDark ? '#fff' : '#000',
        tabBarInactiveTintColor: isDark ? '#666' : '#999',
        tabBarStyle: {
          backgroundColor: isDark ? '#000' : '#fff',
          borderTopWidth: 0,
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: 12,
        },
        tabBarItemStyle: {
          gap: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}>
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Compass size={size} color={color} />,
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, size }) => <Vault size={size} color={color} />,
          tabBarShowLabel: false,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
          tabBarShowLabel: false,
        }}
      />
    </Tabs>
  );
}

