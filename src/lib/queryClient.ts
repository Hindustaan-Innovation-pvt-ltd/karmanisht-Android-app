import { QueryClient, onlineManager } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Configure the online manager to listen to network connectivity state changes via NetInfo.
// This ensures queries are paused while offline and retried/refetched immediately on reconnection.
onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes. On slow 3G/4G, this prevents duplicate API requests 
      // during navigation or screen re-mounts.
      staleTime: 5 * 60 * 1000,

      // Keep unused query data in memory/cache for 24 hours.
      // This is crucial for retrieving cached values when the user goes offline or is on 3G.
      gcTime: 24 * 60 * 60 * 1000,

      // Retry failed queries up to 3 times to cope with intermittent network drops.
      retry: 3,

      // Exponential backoff retry delay (1s, 2s, 4s, 8s...) capped at 30 seconds.
      // Helps avoid spamming the network when latency is very high or the connection is flaky.
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Disable window focus refetching (not applicable/wasteful in React Native on mobile).
      refetchOnWindowFocus: false,

      // Refetch stale queries immediately when network connection is re-established.
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry failed mutations once on network glitch.
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(2000 * 2 ** attemptIndex, 10000),
    },
  },
});

// Configure the AsyncStorage persister to store the Query Cache on the device.
// This allows the app to load instantly with cached data even when offline or on slow connections,
// and revalidate in the background.
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'HINDUSTAN_QUERY_CACHE',
  throttleTime: 1000, // Debounce storage write operations to improve performance
});
