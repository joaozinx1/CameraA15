import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, useCodeScanner } from 'react-native-vision-camera';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function App() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [cameraPosition, setCameraPosition] = useState<'back' | 'front'>('front');
  const device = useCameraDevice(cameraPosition);
  const camera = useRef<Camera>(null);

  const [zoom, setZoom] = useState(1);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [lastPhotoUri, setLastPhotoUri] = useState<string | null>(null);
  const [mode, setMode] = useState<'RETRATO' | 'FOTO' | 'VÍDEO'>('RETRATO');
  const [isProcessing, setIsProcessing] = useState(false);

  const [faceBounds, setFaceBounds] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && codes[0].frame) {
        const { x, y, width, height } = codes[0].frame;
        setFaceBounds({ x, y, width, height });
      }
    },
  });

  const toggleCameraPosition = () => {
    setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
    setZoom(1);
    setFaceBounds(null);
  };

  const applyAIPostProcessing = async (photoPath: string) => {
    setIsProcessing(true);
    try {
      const fileUri = `file://${photoPath}`;
      const savedUri = await CameraRoll.saveAsset(fileUri, { type: 'photo' });
      setLastPhotoUri(savedUri.node.image.uri);
      console.log('Foto salva na galeria:', savedUri.node.image.uri);
    } catch (e) {
      console.error('Erro no processamento:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const takePhoto = async () => {
    if (!camera.current || isProcessing) return;

    try {
      const photo = await camera.current.takePhoto({
        flash: device?.hasFlash ? flash : 'off',
        enableShutterSound: true,
      });

      await applyAIPostProcessing(photo.path);
    } catch (e) {
      console.error('Erro ao capturar foto:', e);
    }
  };

  if (!hasPermission || device == null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffe600" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
          zoom={zoom}
          enableHighQualityPhotos={true}
          lowLightBoost={device.supportsLowLightBoost}
          codeScanner={codeScanner}
        />

        <View style={styles.gridOverlay} pointerEvents="none">
          <View style={styles.gridRow}>
            <View style={styles.gridCell} />
            <View style={styles.gridCell} />
            <View style={styles.gridCell} />
          </View>
          <View style={styles.gridRow}>
            <View style={styles.gridCell} />
            <View style={styles.gridCell} />
            <View style={styles.gridCell} />
          </View>
          <View style={styles.gridRow}>
            <View style={styles.gridCell} />
            <View style={styles.gridCell} />
            <View style={styles.gridCell} />
          </View>
        </View>

        {mode === 'RETRATO' && (
          <View style={styles.faceOverlayContainer} pointerEvents="none">
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{isProcessing ? 'Processando IA...' : 'Pronto'}</Text>
            </View>

            {faceBounds ? (
              <View
                style={[
                  styles.dynamicYellowBox,
                  {
                    left: faceBounds.x,
                    top: faceBounds.y,
                    width: faceBounds.width,
                    height: faceBounds.height,
                  },
                ]}
              />
            ) : (
              <View style={styles.defaultYellowBox} />
            )}
          </View>
        )}
      </View>

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setFlash(flash === 'off' ? 'on' : 'off')}>
          <Text style={styles.topIcon}>{flash === 'off' ? '⚡⃠' : '⚡'}</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.topIcon}>✨ IA ON</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.modesRow}>
          {(['RETRATO', 'FOTO', 'VÍDEO'] as const).map((m) => (
            <TouchableOpacity key={m} onPress={() => setMode(m)}>
              <Text style={[styles.modeText, mode === m && styles.modeActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.shutterRow}>
          <TouchableOpacity style={styles.galleryCircle}>
            {lastPhotoUri ? (
              <Image source={{ uri: lastPhotoUri }} style={styles.galleryImage} />
            ) : (
              <View style={styles.galleryEmpty} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.shutterOuter, isProcessing && { opacity: 0.5 }]} 
            onPress={takePhoto} 
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.flipCircle} onPress={toggleCameraPosition}>
            <Text style={styles.flipIcon}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraWrapper: {
    flex: 1,
    width: '100%',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  faceOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: '15%',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  statusText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  defaultYellowBox: {
    width: 220,
    height: 270,
    borderWidth: 2,
    borderColor: '#ffe600',
    borderRadius: 14,
  },
  dynamicYellowBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#ffe600',
    borderRadius: 10,
  },
  topBar: {
    position: 'absolute',
    top: 45,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justify.content: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 35,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  modesRow: {
    flexDirection: 'row',
    justify.content: 'space-around',
    width: '70%',
    marginBottom: 20,
  },
  modeText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  modeActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justify.content: 'space-between',
    width: '80%',
  },
  galleryCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#222',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: '#111',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  flipCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justify.content: 'center',
    alignItems: 'center',
  },
  flipIcon: {
    fontSize: 20,
  },
});
