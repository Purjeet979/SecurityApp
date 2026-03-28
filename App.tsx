import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from './src/screens/DashboardScreen';
import ScanPhotoScreen from './src/screens/ScanPhotoScreen';
import MessageScannerScreen from './src/screens/MessageScannerScreen';
import ReportScreen from './src/screens/ReportScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: { backgroundColor: '#1E293B', borderTopWidth: 0 },
            tabBarActiveTintColor: '#4F46E5',
            tabBarInactiveTintColor: '#94A3B8',
          }}
        >
          <Tab.Screen 
            name="Dashboard" 
            component={DashboardScreen} 
            options={{ tabBarIcon: () => null, tabBarLabel: '🛡️ Dashboard' }} 
          />
          <Tab.Screen 
            name="Message Scanner" 
            component={MessageScannerScreen} 
            options={{ tabBarIcon: () => null, tabBarLabel: '💬 Msg Scan' }} 
          />
          <Tab.Screen 
            name="Scan Photo" 
            component={ScanPhotoScreen} 
            options={{ tabBarIcon: () => null, tabBarLabel: '📸 Photo Scan' }} 
          />
          <Tab.Screen 
            name="Report Assistant" 
            component={ReportScreen} 
            options={{ tabBarIcon: () => null, tabBarLabel: '📢 Report' }} 
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default App;
