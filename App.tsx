import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { setNotificationHandler } from './services/NotificationService'; 
import { RootStackParamList } from './types/NavigationTypes'; // Use new types file

import WebViewScreen from './screens/WebViewScreen';
import VideoPlayerScreen from './screens/VideoPlayerScreen';

// Set the global handler when the app starts
setNotificationHandler(); 

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="WebView"
        screenOptions={{
          headerStyle: { backgroundColor: '#191970' }, 
          headerTintColor: '#fff', 
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        <Stack.Screen 
          name="WebView" 
          component={WebViewScreen} 
          options={{ title: 'Web Content & Notifications' }} 
        />
        <Stack.Screen 
          name="VideoPlayer" 
          component={VideoPlayerScreen} 
          options={{ title: 'HLS Video Player' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}