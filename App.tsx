import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import DashboardScreen from './src/screens/DashboardScreen';
import ScanPhotoScreen from './src/screens/ScanPhotoScreen';
import MessageScannerScreen from './src/screens/MessageScannerScreen';
import ReportScreen from './src/screens/ReportScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import LinkScannerScreen from './src/screens/LinkScannerScreen';
import UPIDetectorScreen from './src/screens/UPIDetectorScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: { 
        backgroundColor: '#050810', 
        borderTopWidth: 1, 
        borderTopColor: '#1F2937',
        height: 65,
        paddingBottom: 10,
        paddingTop: 8
      },
      tabBarActiveTintColor: '#6366F1',
      tabBarInactiveTintColor: '#475569',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
    }}
  >
    <Tab.Screen 
      name="Dashboard" 
      component={DashboardScreen} 
      options={{ 
        tabBarLabel: 'Home',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🛡️</Text>
      }} 
    />
    <Tab.Screen 
      name="Message Scanner" 
      component={MessageScannerScreen} 
      options={{ 
        tabBarLabel: 'Scan Msg',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>💬</Text>
      }} 
    />
    <Tab.Screen 
      name="Scan Photo" 
      component={ScanPhotoScreen} 
      options={{ 
        tabBarLabel: 'Scan Face',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📸</Text>
      }} 
    />
    <Tab.Screen 
      name="Report Assistant" 
      component={ReportScreen} 
      options={{ 
        tabBarLabel: 'Report',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📢</Text>
      }} 
    />
  </Tab.Navigator>
);

const linking = {
  prefixes: ['upi://'],
  config: {
    screens: {
      UPIDetector: {
        path: 'pay',
        parse: {
          upiUrl: (url: string) => `upi://pay${url}`,
        },
      },
    },
  },
};

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="QRScanner" component={QRScannerScreen} />
          <Stack.Screen name="LinkScanner" component={LinkScannerScreen} />
          <Stack.Screen name="UPIDetector" component={UPIDetectorScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
