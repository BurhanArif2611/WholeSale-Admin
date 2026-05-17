import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated, Easing, Alert, Vibration } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * useVoiceEngine - Production Voice Control Logic
 * Core hook for managing record states, animations, and transcription.
 * Optimized for en-IN Hinglish support for Indian wholesale operations.
 */
export function useVoiceEngine(onRelease: (transcript: string) => void) {
  const [isHolding, setIsHolding] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [partialText, setPartialText] = useState('');
  
  // Visual state
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const bars = useRef([...Array(7)].map(() => new Animated.Value(0.15))).current;

  // Animation sequences
  const startAnimations = useCallback(() => {
    Animated.parallel([
      Animated.timing(glow, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1.2, friction: 3, useNativeDriver: true }),
      ...bars.map((b, i) => 
        Animated.loop(
          Animated.sequence([
            Animated.timing(b, { toValue: 0.3 + Math.random() * 0.7, duration: 240 + i * 40, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
            Animated.timing(b, { toValue: 0.15, duration: 240 + i * 40, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
          ])
        )
      )
    ]).start();
  }, [glow, scale, bars]);

  const stopAnimations = useCallback(() => {
    glow.stopAnimation();
    scale.stopAnimation();
    bars.forEach(b => b.stopAnimation());
    
    Animated.parallel([
      Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ...bars.map(b => Animated.timing(b, { toValue: 0.15, duration: 200, useNativeDriver: false }))
    ]).start();
  }, [glow, scale, bars]);

  useEffect(() => {
    async function checkAvailability() {
      try {
        // @ts-ignore - ExpoSpeechRecognitionModule API variation
        const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        // @ts-ignore - ExpoSpeechRecognitionModule API variation
        const available = await ExpoSpeechRecognitionModule.isAvailableAsync();
        setIsAvailable(status === 'granted' && available);
      } catch (e) {
        console.warn('[Voice] Availability check failed:', e);
      }
    }
    checkAvailability();

    // Global listener for results
    // @ts-ignore - ExpoSpeechRecognitionModule API variation
    const resultSub = (ExpoSpeechRecognitionModule as any).addListener('result', (event: any) => {
      if (event.results && event.results.length > 0) {
        const transcript = event.results[0].transcript;
        if (event.isFinal) {
          onRelease(transcript);
          setPartialText('');
        } else {
          setPartialText(transcript);
        }
      }
    });

    // @ts-ignore - ExpoSpeechRecognitionModule API variation
    const errorSub = (ExpoSpeechRecognitionModule as any).addListener('error', (event: any) => {
      console.warn('[Voice] Transcription error:', event.error, event.message);
      setIsHolding(false);
      stopAnimations();
    });

    return () => {
      if (resultSub && (resultSub as any).remove) (resultSub as any).remove();
      if (errorSub && (errorSub as any).remove) (errorSub as any).remove();
      ExpoSpeechRecognitionModule.stop();
    };
  }, [onRelease, stopAnimations]);

  const startRecording = async () => {
    if (!isAvailable) {
      const { status } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission Error', 'Microphone access is required for voice commands.');
      }
      setIsAvailable(true);
    }

    try {
      Vibration.vibrate(10);
      setIsHolding(true);
      startAnimations();
      
      // @ts-ignore - ExpoSpeechRecognitionModule API variation
      await ExpoSpeechRecognitionModule.start({
        lang: 'en-IN', 
        interimResults: true,
        continuous: false, // Stop when user stops talking or releases button
      });
    } catch (err) {
      console.error('[Voice] Start record failed:', err);
      setIsHolding(false);
      stopAnimations();
    }
  };

  const handlePressOut = async () => {
    if (!isHolding) return;
    setIsHolding(false);
    stopAnimations();
    
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.warn('[Voice] Stop failed:', err);
    }
  };

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });

  return {
    isHolding,
    isAvailable,
    partialText,
    scale,
    glowOpacity,
    bars,
    startRecording,
    handlePressOut,
  };
}
