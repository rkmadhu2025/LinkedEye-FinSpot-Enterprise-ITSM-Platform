import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import incidentsReducer from './slices/incidentsSlice';
import changesReducer from './slices/changesSlice';
import assetsReducer from './slices/assetsSlice';
import usersReducer from './slices/usersSlice';
import uiReducer from './slices/uiSlice';
import problemsReducer from './slices/problemsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    incidents: incidentsReducer,
    changes: changesReducer,
    assets: assetsReducer,
    users: usersReducer,
    ui: uiReducer,
    problems: problemsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/refreshToken/fulfilled'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
