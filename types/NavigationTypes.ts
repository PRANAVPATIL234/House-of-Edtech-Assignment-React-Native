import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  WebView: undefined; 
  VideoPlayer: undefined; 
};

// Generic type for any screen's navigation props
export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;