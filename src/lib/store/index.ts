import { create } from 'zustand';
import { AppStoreType } from './types';
import { createAuthSlice } from './slices/authSlice';
import { createCommonSlice } from './slices/commonSlice';
import { createConsumerSlice } from './slices/consumerSlice';
import { createWorkerSlice } from './slices/workerSlice';
import { createTranslationSlice } from './slices/translationSlice';

export const useAppStore = create<AppStoreType>((...a) => ({
    ...createAuthSlice(...a),
    ...createCommonSlice(...a),
    ...createConsumerSlice(...a),
    ...createWorkerSlice(...a),
    ...createTranslationSlice(...a),
}));

export * from './types';
