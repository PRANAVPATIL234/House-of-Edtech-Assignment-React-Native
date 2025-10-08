# House of EdTech Assignment: Fully Featured Media and WebView App

This project is a fully functional **React Native (Expo)** application that demonstrates proficiency in essential mobile development areas, including handling external content, device features (notifications), custom media playback, and robust state management.

The application successfully implements **all core assignment requirements** and **all four major optional Bonus Challenges**.

---

## 🚀 Project Overview & Feature List

The application is split into two main navigable screens, each demonstrating specific platform capabilities:

### 1. WebView & Notifications Page

| Feature | Details | Requirement Status |
| :--- | :--- | :--- |
| **WebView Embedding** | Embeds a website with dynamic URL input, loading indicators, and robust error handling. | **Core** ✅ |
| **URL Validation** | Custom service (`UrlService`) ensures all loaded URLs use the `http` or `https` protocol. | **Core** (Enhanced UX) |
| **Local Notifications** | Buttons launch a configurable modal to set **distinct messages** and schedule notifications with a **user-defined delay** ($\text{1-10s}$ range). | **Core** ✅ |
| **Notification on Load** | Sends a confirmation notification when the WebView finishes loading successfully. | **Bonus 1** ✅ |
| **Navigable Notifications**| Tapping the notification opens the **Video Player Page**, passing navigation instructions via the payload. | **Bonus 2** ✅ |

### 2. HLS Video Player Page

| Feature | Details | Requirement Status |
| :--- | :--- | :--- |
| **HLS Playback** | Plays the required HLS test stream using Expo's `<Video>` component. | **Core** ✅ |
| **Custom Controls** | Implements a complete custom UI for playback control, including: Play/Pause, Seek Slider (Time Track), $\pm 10$s Skip buttons, and Volume Slider. | **Bonus 3** ✅ |
| **Dynamic Stream Switching** | A text input allows loading any valid HLS stream URL at runtime. | **Bonus 4** ✅ |
| **Fullscreen Management** | Custom logic uses `presentFullscreenPlayer/dismissFullscreenPlayer` synchronized with `expo-screen-orientation` to reliably lock the device to **Landscape** on entry and **Portrait** on exit. | **Core** ✅ |
| **Background Pause** | Uses React Navigation's `useFocusEffect` to pause the video when the screen is navigated away from. | **Core** (Enhanced UX) |

---

## Architecture and Code Structure

The project maintains **good code quality and readability** by separating logic and UI:

* **`services/`**: Houses independent logic for **Notifications** and **URL Validation**.
* **`types/`**: Centralized TypeScript interfaces (`RootStackParamList`).
* **`useScreenDimensions` Hook:** Provides dynamic screen dimensions for responsive fullscreen layouts.

---

## 🛠️ Installation and Execution

The application is built to run successfully both locally and in **Expo Go**.

### Dependencies

This project uses the following key packages:

| Package | Purpose |
| :--- | :--- |
| `@react-native-community/slider` | Custom UI component for volume and seek bars. |
| `@react-navigation/native-stack` | Handles app navigation. |
| `expo-av` | Core media playback for HLS streams. |
| `expo-notifications` | Handles delayed local notifications. |
| `react-native-webview` | Embeds the external website. |
| `expo-screen-orientation` | Manages device orientation for fullscreen video. |

### How to Run the Project

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/PRANAVPATIL234/House-of-Edtech-Assignment-React-Native.git
    cd House-of-Edtech-Assignment-React-Native
    ```
2.  **Install project dependencies:**
    ```bash
    npm install
    ```
3.  **Start the Expo project:**
    ```bash
    npx expo start
    ```
4.  Scan the QR code with the **Expo Go** app on your iOS or Android device.
