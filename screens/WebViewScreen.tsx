import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  TouchableOpacity,
  Text,
} from "react-native";
import { WebView } from "react-native-webview";
import CustomButton from "../components/CustomButton";
import { Colors, Spacing, Typography } from "../constants/Colors";
import { ScreenProps, RootStackParamList } from "../types/NavigationTypes";
import {
  getNotificationPermissions,
  scheduleLocalNotification,
  handleNotificationTaps,
} from "../services/NotificationService";
import { validateAndNormalizeUrl } from "../services/UrlService";

type Props = ScreenProps<"WebView">;

const DEFAULT_URL = "https://expo.dev/";

// Configuration constants for the Modal/BottomSheet
// Define possible target screen names
type TargetScreen = keyof RootStackParamList;
const NOTIFICATION_OPTIONS: { label: string; value: TargetScreen }[] = [
  { label: "Go to Video Player", value: "VideoPlayer" },
  { label: "Stay on Current Page", value: "WebView" },
];

// Define the shape for the notification configuration state
interface NotificationConfig {
  delay: string; // Stored as string for TextInput
  message: string;
  targetScreen: TargetScreen;
  isNavigable: boolean; // True if opened by Notify & Navigate button
}

const WebViewScreen: React.FC<Props> = ({ navigation }) => {
  // --- State ---
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [inputUrl, setInputUrl] = useState(DEFAULT_URL);
  const [loadedUrl, setLoadedUrl] = useState(DEFAULT_URL);
  const [isLoading, setIsLoading] = useState(false);
  // Flag ensures the notification only fires once per new successful load.
  const [hasNotifiedOnLoad, setHasNotifiedOnLoad] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [config, setConfig] = useState<NotificationConfig>({
    delay: "3", // Default delay to 3 seconds
    message: "This is a custom notification!",
    targetScreen: "WebView", // Default initial value
    isNavigable: false,
  });

  // --- Effects (Side Effects) ---
  useEffect(() => {
    // Get permissions on startup
    getNotificationPermissions().then((granted) => {
      setPermissionsGranted(granted);
    });

    // Set up notification tap listener
    const cleanup = handleNotificationTaps(navigation);
    return () => cleanup();
  }, [navigation]);

  // --- Local Logic ---
  const loadWebView = () => {
    const validationResult = validateAndNormalizeUrl(inputUrl);

    if (validationResult.isValid && validationResult.normalizedUrl) {
      // Only update state if the URL is actually changing
      if (validationResult.normalizedUrl !== loadedUrl) {
        // Reset the load notification flag so it fires again for the new site
        setHasNotifiedOnLoad(false);
        setWebViewError(null);
        setLoadedUrl(validationResult.normalizedUrl);
      }
      // Keep input field updated with normalized URL
      setInputUrl(validationResult.normalizedUrl);
    } else {
      Alert.alert(
        "Invalid URL",
        "Please enter a valid website link (must be http/https)."
      );
    }
  };

  const handleLoadingStart = () => {
    setIsLoading(true);
    setWebViewError(null);
  };

  const handleLoadingEnd = (syntheticEvent: any) => {
    setIsLoading(false); // A simple check: if nativeEvent.loading is false, the process is done.

    const nativeEvent = syntheticEvent?.nativeEvent; // Check if the loading process finished successfully (i.e., not an error code)
    const isSuccessful =
      !nativeEvent.loading && nativeEvent.title !== "Webpage not available"; // Notification when WebView finishes loading (and hasn't errored)

    if (permissionsGranted && !hasNotifiedOnLoad && isSuccessful) {
      scheduleLocalNotification({
        title: "App Status Update",
        body: `The website at ${loadedUrl} is fully loaded.`,
        delaySeconds: 1,
      });
      setHasNotifiedOnLoad(true);
    }
  };

  const handleLoadingError = (syntheticEvent: any) => {
    setIsLoading(false);
    const { nativeEvent } = syntheticEvent;

    // Show a user-friendly error message based on the native error code/description
    const errorMessage = `Failed to load '${nativeEvent.url}': ${
      nativeEvent.description || "Unknown Error"
    }.`;
    setWebViewError(errorMessage);
    console.error("WebView Critical Error:", nativeEvent);

    // Optional: Send a notification on error for debugging
    if (permissionsGranted) {
      scheduleLocalNotification({
        title: "Load Failed! 🛑",
        body: `Could not reach ${loadedUrl}. Please check the URL and your network.`,
        delaySeconds: 1,
      });
    }
  };

  // --- User-triggered notification handlers  ---
  const openModal = (isNavigable: boolean) => {
    // Set configuration based on which button was pressed
    setConfig({
      delay: "3",
      message: isNavigable
        ? "Tap me to see the HLS Video Player!"
        : "Your action was confirmed.",
      //Ensure the targetScreen is explicitly set based on the button type
      targetScreen: isNavigable ? "VideoPlayer" : "WebView",
      isNavigable: isNavigable,
    });
    setIsModalVisible(true);
  };

  const closeModal = () => setIsModalVisible(false);

  const handleSendNotification = () => {
    const parsedDelay = parseInt(config.delay, 10);

    // We enforce 1-10s for the custom notification input.
    if (isNaN(parsedDelay) || parsedDelay < 1 || parsedDelay > 10) {
      Alert.alert(
        "Invalid Delay",
        "Please enter an integer delay between 1 and 10 seconds."
      );
      return;
    }

    // 2. Schedule Notification using User Input
    if (permissionsGranted) {
      scheduleLocalNotification({
        title: config.isNavigable
          ? "Custom Navigation Alert"
          : "Custom Action Alert",
        body: config.message,
        // PASS THE PARSED NUMBER DIRECTLY.
        delaySeconds: parsedDelay,
        // Pass targetScreen in data only if isNavigable is true
        data: config.isNavigable ? { targetScreen: config.targetScreen } : {},
      });
      closeModal();
    } else {
      Alert.alert("Error", "Notification permissions not granted.");
    }
  };
  const triggerNotification1 = () => openModal(true); // Notify & Navigate
  const triggerNotification2 = () => openModal(false); // Notify: Action Done

  // --- Render ---
  return (
    <View style={styles.container}>
      {/* 1. URL Input and Load Button */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          onChangeText={setInputUrl}
          value={inputUrl}
          placeholder="Enter website link (e.g., example.com)"
          autoCapitalize="none"
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={loadWebView}
        />
        <CustomButton
          title="Load"
          onPress={loadWebView}
          variant="accent"
          style={styles.loadButton}
        />
      </View>

      {/* 2. WebView Component with Loading Indicator */}
      <View style={styles.webviewContainer}>
         {webViewError ? (
            <View style={styles.errorContainer}>
                {/* Ensure NO empty lines or spaces between <Text> siblings */}
                <Text style={styles.errorTitle}>🚫 Load Failed</Text>
                <Text style={styles.errorMessage}>{webViewError}</Text>
                <Text style={styles.errorTip}>
                  Check your URL and network connection.
                </Text>
            </View>
        ) : (
        <WebView
          source={{ uri: loadedUrl }}
          style={styles.webview}
          onLoadStart={handleLoadingStart}
          onLoadEnd={handleLoadingEnd}
          onError={({ nativeEvent }) => {
            handleLoadingEnd({ nativeEvent }); // Ensure loading stops on error
            console.error("WebView Error:", nativeEvent.description);
          }}
        />)}
        {isLoading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}
      </View>

      {/* 3. Notification Buttons - now open the modal */}
      <View style={styles.buttonRow}>
        <CustomButton
          title="Notify & Navigate"
          onPress={triggerNotification1} // Opens Modal (isNavigable=true)
          variant="primary"
          style={styles.notificationButton}
        />
        <CustomButton
          title="Notify: Action Done"
          onPress={triggerNotification2} // Opens Modal (isNavigable=false)
          variant="primary"
          style={styles.notificationButton}
        />
      </View>

      {/* --- NEW: Notification Configuration Modal --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={closeModal}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>
              Configure Notification:
              <Text
                style={{
                  color: config.isNavigable ? Colors.accent : Colors.primary,
                }}
              >
                {config.isNavigable ? "Navigable" : "Simple"}
              </Text>
            </Text>

            {/* 1. Delay Input */}
            <Text style={modalStyles.label}>Delay (1-10 seconds):</Text>
            <TextInput
              // Use modalStyles.input for consistency
              style={modalStyles.input}
              onChangeText={(text) =>
                setConfig({ ...config, delay: text.replace(/[^0-9]/g, "") })
              }
              value={config.delay}
              keyboardType="numeric"
              maxLength={2}
            />

            {/* 2. Message Input */}
            <Text style={modalStyles.label}>Notification Message:</Text>
            <TextInput
              style={[modalStyles.input, { height: 80 }]}
              onChangeText={(text) => setConfig({ ...config, message: text })}
              value={config.message}
              multiline
              maxLength={100}
            />

            {/* 3. Navigation Target (Only for Notify & Navigate) */}
            {config.isNavigable && (
              <>
                <Text style={modalStyles.label}>
                  Navigation Target (on tap):
                </Text>
                <View style={modalStyles.optionContainer}>
                  {NOTIFICATION_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        modalStyles.option,
                        config.targetScreen === option.value &&
                          modalStyles.optionSelected,
                      ]}
                      onPress={() =>
                        setConfig({
                          ...config,
                          targetScreen: option.value,
                        })
                      }
                    >
                      <Text style={modalStyles.optionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Action Buttons */}
            <View style={modalStyles.buttonRow}>
              <CustomButton
                title="Cancel"
                onPress={closeModal}
                variant="primary"
                style={modalStyles.actionButton}
              />
              <CustomButton
                title={`Send in ${config.delay}s`}
                onPress={handleSendNotification}
                variant="accent"
                style={modalStyles.actionButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 4. Navigation Button */}
      <View style={styles.navContainer}>
        <CustomButton
          title="Go to HLS Video Player"
          variant="accent"
          onPress={() => navigation.navigate("VideoPlayer")}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inputRow: {
    flexDirection: "row",
    padding: Spacing.medium,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: Colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.small,
    marginRight: Spacing.small,
    backgroundColor: Colors.card,
  },
  loadButton: { width: 80, height: 40 },
 webviewContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  webview: { flex: 1 },
  loadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
    // NEW Styles for error display
    errorContainer: {
        flex: 1,
        padding: Spacing.xlarge,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    errorTitle: {
        fontSize: Typography.header,
        fontWeight: 'bold',
        color: Colors.danger,
        marginBottom: Spacing.small,
    },
    errorMessage: {
        fontSize: Typography.body,
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.medium,
    },
    errorTip: {
        fontSize: Typography.caption,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.small,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  notificationButton: { flex: 1, marginHorizontal: Spacing.small },
  navContainer: {
    padding: Spacing.medium,
    backgroundColor: Colors.card,
    alignItems: "center",
  },
});

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "flex-end", // Aligns modal to the bottom
    backgroundColor: "rgba(0,0,0,0.5)", // Semi-transparent overlay
  },
  modalView: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xlarge,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: Typography.title,
    fontWeight: "bold",
    marginBottom: Spacing.large,
    color: Colors.text,
  },
  label: {
    fontSize: Typography.body,
    color: Colors.textSecondary,
    marginTop: Spacing.small,
    marginBottom: Spacing.xsmall,
  },
  input: {
    width: "100%",
    height: 40,
    borderColor: Colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.small,
    backgroundColor: Colors.card,
    marginBottom: Spacing.medium,
  },
  optionContainer: {
    flexDirection: "row",
    marginBottom: Spacing.large,
    marginTop: Spacing.small,
    justifyContent: "space-between",
  },
  option: {
    paddingVertical: Spacing.small,
    paddingHorizontal: Spacing.medium,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
    alignItems: "center",
    marginHorizontal: Spacing.xsmall,
  },
  optionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    fontWeight: "bold",
  },
  optionText: {
    color: Colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: Spacing.large,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: Spacing.small,
  },
});

export default WebViewScreen;
