// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';

interface MediaLibraryPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (image: { uri: string; size?: number }) => void;
}

export default function MediaLibraryPicker({ visible, onClose, onSelect }: MediaLibraryPickerProps) {
  const { colors, isDark } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [selectingAssetId, setSelectingAssetId] = useState<string | null>(null);

  // Reset/fetch state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setAssets([]);
      setEndCursor(undefined);
      setHasNextPage(true);
      checkPermissions();
    }
  }, [visible]);

  const checkPermissions = async () => {
    try {
      const { status } = await MediaLibrary.getPermissionsAsync(false, ['photo']);
      if (status === 'granted') {
        setHasPermission(true);
        loadInitialAssets();
      } else {
        setHasPermission(false);
        // Request permission automatically if not determined yet
        if (status === 'undetermined') {
          requestPermission();
        }
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      setHasPermission(false);
    }
  };

  const requestPermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
      if (status === 'granted') {
        setHasPermission(true);
        loadInitialAssets();
      } else {
        setHasPermission(false);
        Alert.alert(
          'Permission Required',
          'Please allow media library access to pick profile photos from your gallery.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Request Again', onPress: requestPermission }
          ]
        );
      }
    } catch (err) {
      console.error('Error requesting permission:', err);
      setHasPermission(false);
    }
  };

  const loadInitialAssets = async () => {
    setLoading(true);
    try {
      const result = await MediaLibrary.getAssetsAsync({
        first: 30,
        mediaType: 'photo',
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      setAssets(result.assets || []);
      setEndCursor(result.endCursor);
      setHasNextPage(result.hasNextPage);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreAssets = async () => {
    if (!hasNextPage || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const result = await MediaLibrary.getAssetsAsync({
        first: 30,
        after: endCursor,
        mediaType: 'photo',
        sortBy: [[MediaLibrary.SortBy.creationTime, false]],
      });
      setAssets((prev) => [...prev, ...(result.assets || [])]);
      setEndCursor(result.endCursor);
      setHasNextPage(result.hasNextPage);
    } catch (error) {
      console.error('Error loading more assets:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAssetSelect = async (asset: MediaLibrary.Asset) => {
    setSelectingAssetId(asset.id);
    try {
      // getAssetInfoAsync retrieves the localUri (file://) format which is required for S3 uploads
      const info = await MediaLibrary.getAssetInfoAsync(asset.id);
      const localUri = info.localUri || asset.uri;
      const size = info.size || asset.fileSize || 0;
      
      onSelect({ uri: localUri, size });
      onClose();
    } catch (error) {
      console.error('Error getting asset info:', error);
      Alert.alert('Error', 'Failed to load high resolution version of the selected image.');
    } finally {
      setSelectingAssetId(null);
    }
  };

  const renderItem = ({ item }: { item: MediaLibrary.Asset }) => {
    const isSelecting = selectingAssetId === item.id;
    return (
      <TouchableOpacity
        style={styles.gridItem}
        onPress={() => handleAssetSelect(item)}
        disabled={selectingAssetId !== null}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.uri }} style={styles.image} />
        {isSelecting && (
          <View style={[StyleSheet.absoluteFill, styles.overlay]}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <View 
          className="bg-white dark:bg-slate-900 rounded-t-3xl overflow-hidden" 
          style={{ height: Dimensions.get('window').height * 0.75 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <Text className="text-xl font-bold text-slate-900 dark:text-white">Select Photo</Text>
            <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <Ionicons name="close" size={20} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View className="flex-1">
            {hasPermission === false && (
              <View className="flex-1 items-center justify-center p-6 gap-4">
                <Text className="text-center text-slate-500 dark:text-slate-400 text-base">
                  Media library permission is required to choose a photo.
                </Text>
                <TouchableOpacity
                  onPress={requestPermission}
                  className="bg-black dark:bg-blue-600 px-6 py-3 rounded-xl"
                >
                  <Text className="text-white font-bold">Grant Access</Text>
                </TouchableOpacity>
              </View>
            )}

            {hasPermission && loading && (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            )}

            {hasPermission && !loading && assets.length === 0 && (
              <View className="flex-1 items-center justify-center p-6">
                <Text className="text-slate-500 dark:text-slate-400 text-center">
                  No photos found in library.
                </Text>
              </View>
            )}

            {hasPermission && assets.length > 0 && (
              <FlatList
                data={assets}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={3}
                onEndReached={loadMoreAssets}
                onEndReachedThreshold={0.5}
                contentContainerStyle={styles.listContainer}
                ListFooterComponent={
                  loadingMore ? (
                    <View className="py-4">
                      <ActivityIndicator color={colors.tint} />
                    </View>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 2,
  },
  gridItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    margin: 2,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
