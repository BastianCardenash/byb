import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  uri: string;
  cacheKey: string;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

export function ZoomablePhoto({ uri, cacheKey }: Props) {
  'use no memo';
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = usePinchGesture({
    onBegin: () => {
      savedScale.value = scale.value;
    },
    onUpdate: (e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.max(0.8, Math.min(MAX_SCALE, next));
    },
    onFinalize: () => {
      if (scale.value <= MIN_SCALE) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    },
  });

  const pan = usePanGesture({
    onBegin: () => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    },
    onUpdate: (e) => {
      if (scale.value <= 1.02) return;
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    },
    onFinalize: () => {
      if (scale.value <= 1.02) {
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        savedTx.value = tx.value;
        savedTy.value = ty.value;
      }
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      if (scale.value > 1.2) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        savedScale.value = 1;
        savedTx.value = 0;
        savedTy.value = 0;
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
      }
    },
  });

  const gesture = useSimultaneousGestures(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.wrap, animatedStyle]}>
        <Image
          source={{ uri, cacheKey }}
          style={styles.image}
          contentFit="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    width: '100%',
  },
  image: {
    flex: 1,
    width: '100%',
  },
});
