import Constants, { ExecutionEnvironment } from 'expo-constants';

/** Expo Go ships without react-native-ble-plx and can't run background location tasks. */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
