import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Animated,
  Easing,
} from "react-native";
import Slider from "@react-native-community/slider";
import {
  Video,
  ResizeMode,
  AVPlaybackStatus,
  VideoFullscreenUpdateEvent,
  AVPlaybackStatusSuccess,
} from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from '@react-navigation/native'; // Used for background pause
import { RootStackParamList } from "../types/NavigationTypes";
import { Colors, Spacing, Typography } from "../constants/Colors";
import CustomButton from "../components/CustomButton";
import { MaterialIcons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<RootStackParamList, "VideoPlayer">;

const INITIAL_HLS_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"; // Required test URL [cite: 20, 21]
const SKIP_TIME_MS = 10000; // 10 seconds skip/forward time 
const CONTROL_FADE_TIMEOUT = 3000;

const { width: windowWidth, height: windowHeight } = Dimensions.get("window"); 

// --- Dynamic Dimension Hook (Ensures proper sizing on rotation) ---
const useScreenDimensions = () => {
  const [dimensions, setDimensions] = useState(Dimensions.get("window"));

  useEffect(() => {
    const onChange = ({ window }: { window: any }) => { setDimensions(window); };
    const subscription = Dimensions.addEventListener("change", onChange);
    return () => subscription.remove();
  }, []);
  return dimensions;
};
// ----------------------------------------------

// Helper function to format milliseconds into MM:SS
const formatTime = (ms: number): string => {
  if (!ms) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const VideoPlayerScreen: React.FC<Props> = ({ navigation }) => {
  const videoRef = useRef<Video>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current; // For animated opacity of controls
  let hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const screenDimensions = useScreenDimensions();

  // --- State Management ---
  const [currentVideoUrl, setCurrentVideoUrl] = useState(INITIAL_HLS_URL); // Current playing URL 
  const [inputVideoUrl, setInputVideoUrl] = useState(INITIAL_HLS_URL); // Input field state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); // Tracks fullscreen state [cite: 22]
  const [duration, setDuration] = useState(0); 
  const [position, setPosition] = useState(0); 
  const [volume, setVolume] = useState(1.0); // Volume state
  const [isBuffering, setIsBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false); 

  // --- Responsive Dims ---
  const currentWidth = screenDimensions.width;
  const currentHeight = screenDimensions.height;
  
  // CORE REQUIREMENT: Pause video when screen is not focused 
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Pauses video when user navigates away or app goes to background
        if (videoRef.current) {
          videoRef.current.pauseAsync();
        }
      };
    }, [])
  );

  // --- Control Fade Logic (Tap-to-Show/Hide) ---
  const fadeOutControls = () => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true, }).start(() => setControlsVisible(false));
  };
  
  const fadeInControls = () => {
    if (hideControlsTimer.current) { clearTimeout(hideControlsTimer.current); }
    setControlsVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true, }).start(() => {
        if (isPlaying) {
            hideControlsTimer.current = setTimeout(fadeOutControls, CONTROL_FADE_TIMEOUT);
        }
    });
  };
  
  // Toggle controls on tap
  const handleTap = () => {
    const currentOpacity = (fadeAnim as any).__getValue(); 
    if (!controlsVisible || currentOpacity < 1) {
        fadeInControls();
    } else if (isPlaying) {
        fadeOutControls();
    }
  };

  useEffect(() => {
    if (isPlaying) { fadeInControls(); } else { fadeInControls(); }
    return () => { if (hideControlsTimer.current) { clearTimeout(hideControlsTimer.current); } };
  }, [isPlaying]);

  // --- Playback Handlers ---
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      const successStatus = status as AVPlaybackStatusSuccess; 
      
      if (!isSeeking) {
          setPosition(successStatus.positionMillis || 0); // Update position only if not seeking
      }
      
      setIsPlaying(successStatus.isPlaying);
      setDuration(successStatus.durationMillis || 0);
      setIsBuffering(successStatus.isBuffering); // Track buffering for indicator
      
      if (successStatus.didJustFinish) {
        setIsPlaying(false);
        videoRef.current?.setPositionAsync(0);
      }
    }
  };

  const handleSeekStart = () => {
      setIsSeeking(true); // Flag to stop position updates from status handler
      videoRef.current?.pauseAsync();
  };
  
  const handleSeekComplete = (value: any) => {
      const newPosition = Array.isArray(value) ? value[0] : value;
      handleSeek(newPosition);
      videoRef.current?.playAsync();
      setIsSeeking(false);
  };

  const handleSeek = (newPosition: number) => {
    if (videoRef.current) {
      videoRef.current.setPositionAsync(newPosition);
      setPosition(newPosition);
      fadeInControls();
    }
  };

  // Skip logic 
  const handleSkip = (direction: 'forward' | 'backward') => {
    if (videoRef.current) {
        const newPosition = direction === 'forward' ? Math.min(position + SKIP_TIME_MS, duration) : Math.max(position - SKIP_TIME_MS, 0);
        videoRef.current.setPositionAsync(newPosition);
        setPosition(newPosition);
        fadeInControls(); 
    }
  };

  const handleVolumeChange = async (newVolume: number) => {
    if (videoRef.current) {
      await videoRef.current.setVolumeAsync(newVolume);
      setVolume(newVolume);
    }
  };

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync(); // Pause control [cite: 22]
      } else {
        await videoRef.current.playAsync(); // Play control [cite: 22]
      }
      fadeInControls();
    }
  };

  // Fullscreen control [cite: 22]
  const handleFullscreen = async () => {
    if (videoRef.current) {
      if (isFullscreen) {
        await videoRef.current.dismissFullscreenPlayer();
      } else {
        await videoRef.current.presentFullscreenPlayer();
      }
    }
  };

  // Synchronizes screen orientation with fullscreen state
  const handleFullscreenUpdate = (event: VideoFullscreenUpdateEvent) => {
    const WILL_PRESENT = 1;
    const WILL_DISMISS = 2;

    if (event.fullscreenUpdate === WILL_PRESENT) {
      setIsFullscreen(true);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
    } else if (event.fullscreenUpdate === WILL_DISMISS) {
      setIsFullscreen(false);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
    }
    fadeInControls();
  };
  
  // Dynamic URL switching
  const handleUrlChange = () => {
    if (inputVideoUrl.trim().length > 10 && inputVideoUrl.includes('http')) {
        setCurrentVideoUrl(inputVideoUrl);
        setIsPlaying(false);
        setDuration(0); 
        setPosition(0);
        Alert.alert("URL Changed", "New stream source loaded.");
    } else {
        Alert.alert("Invalid URL", "Please enter a valid stream URL.");
    }
  };

  // --- Render ---
  const videoStyle = isFullscreen ? styles.videoContainerFullscreen : {
      ...styles.videoContainer,
      width: currentWidth * 0.9,
      height: currentWidth * 0.9 * (9 / 16),
  };
  
  const volumeContainerWidth = isFullscreen ? 160 : 120;
  
  return (
    <View style={styles.container}>
      <Text style={styles.header}>HLS Stream Player</Text>

      {/* URL Input (Hidden when Fullscreen) */}
      {!isFullscreen && (
        <View style={styles.inputContainer}>
            <TextInput
                style={styles.urlInput}
                onChangeText={setInputVideoUrl}
                value={inputVideoUrl}
                placeholder="Enter HLS stream URL"
                autoCapitalize="none"
            />
            <CustomButton
                title="Load Stream"
                onPress={handleUrlChange}
                variant="accent"
                style={styles.loadStreamButton}
            />
        </View>
      )}

      {/* Video Container (Core Player Area) */}
      <View style={videoStyle}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: currentVideoUrl }} 
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onFullscreenUpdate={handleFullscreenUpdate}
          useNativeControls={false} // Use custom controls [cite: 22]
          onError={(e) =>
            Alert.alert("Video Error", `Failed to load HLS stream: ${e}`)
          }
        />

        {/* Buffering Indicator */}
        {isBuffering && (
            <ActivityIndicator size="large" color={Colors.accent} style={styles.bufferingIndicator} />
        )}

        {/* Custom Control Overlay (Tap-to-Show/Hide) */}
        <Animated.View 
            style={[styles.controlOverlay, { opacity: controlsVisible ? 1 : 0 }]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={handleTap} // Tap to toggle controls
            pointerEvents={controlsVisible ? 'box-none' : 'auto'} 
        >
            
            {/* Top Bar (Visible in Fullscreen for Exit/Title) */}
            {isFullscreen && controlsVisible && (
                <View style={styles.topControlBar} pointerEvents="auto">
                    <TouchableOpacity onPress={handleFullscreen} style={styles.exitFullscreenButton}>
                        <MaterialIcons name="arrow-back" size={24} color={Colors.card} />
                    </TouchableOpacity>
                    <Text style={styles.videoTitle} numberOfLines={1}>{currentVideoUrl}</Text>
                </View>
            )}

            {/* Main Playback Controls (Centered) */}
            {controlsVisible && (
                <View style={styles.playbackControls} pointerEvents="box-none">
                    <TouchableOpacity onPress={() => handleSkip('backward')} style={styles.skipButton}>
                        <MaterialIcons name="replay-10" size={35} color={Colors.card} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handlePlayPause} style={styles.centerControlButton}>
                        <MaterialIcons
                            name={isPlaying ? "pause-circle-filled" : "play-circle-filled"}
                            size={60}
                            color={Colors.card}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleSkip('forward')} style={styles.skipButton}>
                        <MaterialIcons name="forward-10" size={35} color={Colors.card} />
                    </TouchableOpacity>
                </View>
            )}


            {/* Bottom Bar: Time Scrub, Volume, Fullscreen */}
            {controlsVisible && (
                <View style={styles.bottomControlBar} pointerEvents="auto">
                
                    {/* Time Scrub Bar & Time Text */}
                    <Text style={styles.timeText}>{formatTime(position)}</Text>
                    <Slider
                        style={styles.scrubBar}
                        minimumValue={0}
                        maximumValue={duration}
                        value={position}
                        onSlidingStart={handleSeekStart}
                        onSlidingComplete={handleSeekComplete}
                        minimumTrackTintColor={Colors.accent}
                        maximumTrackTintColor="#aaa"
                        thumbTintColor={Colors.accent}
                    />
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>

                    {/* Volume Slider */}
                    <View style={[styles.volumeContainer, { width: volumeContainerWidth }]}>
                        <MaterialIcons
                            name={volume > 0.5 ? "volume-up" : volume > 0 ? "volume-down" : "volume-off"}
                            size={20}
                            color={Colors.card}
                            style={{ marginRight: Spacing.small }}
                            onPress={()=>{
                             handleVolumeChange(volume ==0 ? 1 : 0)
                            }}
                        />
                        <Slider
                            style={styles.volumeSlider}
                            minimumValue={0}
                            maximumValue={1}
                            value={volume}
                            onValueChange={handleVolumeChange}
                            minimumTrackTintColor={Colors.accent}
                            maximumTrackTintColor="#aaa"
                            thumbTintColor={Colors.card}
                        />
                    </View>

                    {/* Fullscreen Button [cite: 22] */}
                    <TouchableOpacity
                        onPress={handleFullscreen}
                        style={styles.fullscreenButton}
                    >
                        <MaterialIcons
                        name={isFullscreen ? "fullscreen-exit" : "fullscreen"}
                        size={25}
                        color={Colors.card}
                        />
                    </TouchableOpacity>
                </View>
            )}
        </Animated.View>
      </View>

      {/* Info and Back Button (Hidden when Fullscreen) */}
      {!isFullscreen && (
        <>
            {/* <Text style={styles.info}>
                This player is fully functional, supporting HLS [cite: 18, 39], custom controls (seek, skip, volume, full-screen)[cite: 22], and URL switching. 
            </Text> */}

            <View style={styles.buttonContainer}>
                <CustomButton
                title="← Back to WebView"
                variant="primary"
                onPress={() => navigation.navigate("WebView")} 
                />
            </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: Colors.background,
    paddingTop: Spacing.large,
  },
  header: {
    fontSize: Typography.header,
    fontWeight: "bold",
    marginBottom: Spacing.medium,
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.medium,
    marginBottom: Spacing.large,
    width: windowWidth * 0.9,
  },
  urlInput: {
    flex: 1,
    height: 40,
    borderColor: Colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.small,
    marginRight: Spacing.small,
    backgroundColor: Colors.card,
    color: Colors.text,
    fontSize: Typography.body,
  },
  loadStreamButton: {
    height: 40,
    paddingHorizontal: Spacing.medium,
  },
  videoContainer: {
    backgroundColor: "#000",
    marginBottom: Spacing.medium,
    position: "relative",
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 8,
    overflow: 'hidden',
  },
  videoContainerFullscreen: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  bufferingIndicator: {
    position: 'absolute',
    zIndex: 5,
  },
  controlOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.001)', // Transparent touch area
  },
  topControlBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: Spacing.small,
    zIndex: 30,
  },
  exitFullscreenButton: {
    padding: Spacing.xsmall,
  },
  videoTitle: {
    color: Colors.card,
    fontSize: Typography.body,
    marginLeft: Spacing.small,
    flex: 1,
  },
  playbackControls: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    top: '50%',
    left: 0,
    right: 0,
    transform: [{ translateY: -30 }], 
    zIndex: 20, 
  },
  skipButton: {
    padding: Spacing.small,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 8,
  },
  centerControlButton: {
    padding: Spacing.small,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 50,
  },
  bottomControlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.small,
    paddingVertical: Spacing.xsmall,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 30,
  },
  scrubBar: {
    flex: 1,
    height: 30,
    marginHorizontal: Spacing.small,
  },
  timeText: {
    color: Colors.card,
    fontSize: Typography.caption,
    width: 35,
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2
  },
  volumeContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: 120, 
    marginLeft: Spacing.medium,
  },
  volumeSlider: {
    flex: 1,
    height: 20,
  },
  fullscreenButton: {
    paddingLeft: Spacing.medium,
    paddingRight: Spacing.xsmall,
  },
  info: {
    paddingHorizontal: Spacing.large,
    textAlign: "center",
    color: Colors.textSecondary,
    marginBottom: Spacing.large,
    marginTop: Spacing.medium,
  },
  buttonContainer: {
    padding: Spacing.medium,
  },
});

export default VideoPlayerScreen;