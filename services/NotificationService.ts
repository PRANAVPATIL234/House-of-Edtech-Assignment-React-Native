import * as Notifications from "expo-notifications";
import { Platform, Alert } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/NavigationTypes";

// --- Configuration ---
const MIN_DELAY = 2; // Minimum required delay (in seconds) for random
const MAX_DELAY = 5; // Maximum required delay (in seconds) for random

// 1. Set Notification Handler (Global App Startup)
// This dictates how notifications behave when the app is foregrounded.
export const setNotificationHandler = () => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
};

// 2. Request Permissions
export async function getNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert(
      "Permission Required",
      "Notifications will not work unless permissions are enabled in settings."
    );
    return false;
  }
  return true;
}

// 3. Dynamic Schedule Function (Handles all cases)
interface ScheduleOptions {
  title: string;
  body: string;
  // Optional custom delay (for quick status updates or the random 2-5s delay)
  delaySeconds?: number;
  // Optional data to attach (for navigation)
  data?: { targetScreen?: keyof RootStackParamList; [key: string]: any };
}

export async function scheduleLocalNotification({
  title,
  body,
  delaySeconds,
  data,
}: ScheduleOptions) {
  // Determine delay: If delaySeconds is explicitly provided, use it.
  // Otherwise, use the 2-5s random fallback.
  const isCustomDelayProvided = delaySeconds !== undefined;

  const delay = isCustomDelayProvided
    ? delaySeconds! // Use the provided custom delay (assert non-null/undefined)
    : Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY; // Use 2-5s random fallback

  // --- DEBUGGING STEP: Add this log to confirm the delay value ---
  // console.log(
  //   `Scheduling delay: ${delay}s. Custom provided: ${isCustomDelayProvided}. Target: ${data?.targetScreen || 'N/A'}`
  // );
  // -----------------------------------------------------------------

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: {
      seconds: delay,
      channelId: "default", 
    },
  });

  // console.log(
  //   `Notification scheduled (ID: ${identifier}) with ${delay}s delay.`
  // );

}

// 4. Handle Notification Tap
// This function sets up listeners to handle navigation when a notification is tapped.
export function handleNotificationTaps(
  navigation: NativeStackNavigationProp<RootStackParamList, "WebView">
) {
  // 4a. Handle tap if the app is backgrounded/closed
  const subscriptionResponse =
    Notifications.addNotificationResponseReceivedListener((response) => {
      // Use the correct type for data
      const data: ScheduleOptions['data'] = response.notification.request.content.data;
      const targetScreen = data?.targetScreen;

      // Check if the notification contains a targetScreen to navigate to
      if (targetScreen && targetScreen in navigation.getState().routes.map(r => r.name)) {
        console.log(
          `Navigating to ${targetScreen} from notification tap.`
        );
        // Cast targetScreen to the correct union type of RootStackParamList keys
        navigation.navigate(targetScreen as keyof RootStackParamList);
      }
    });

  // 4b. Handle tap if the app is foregrounded
  const subscriptionForeground = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log(
        "Notification received while app is open:",
        notification.request.content.title
      );
    }
  );

  return () => {
    subscriptionResponse.remove();
    subscriptionForeground.remove();
  };
}