// @ts-nocheck
import AsyncStorage from "@react-native-async-storage/async-storage";

const IS_FIRST_TIME = "@@is_first_time";
const USER_DATA = "@@user_data";
const AUTH_TOKEN = "@@auth_token";

export const useAuth = async () => {
  const isFirstTime = (await AsyncStorage.getItem(IS_FIRST_TIME)) === "true";
  const userData = await AsyncStorage.getItem(USER_DATA);
  const authToken = await AsyncStorage.getItem(AUTH_TOKEN);

  return {
    isFirstTime,
    isAuthenticated: !!authToken,
    userData: userData ? JSON.parse(userData) : null,
    clearFirstTime: async () =>
      await AsyncStorage.setItem(IS_FIRST_TIME, "false"),
    setAuthData: async (data: any) => {
      await AsyncStorage.setItem(USER_DATA, JSON.stringify(data));
      await AsyncStorage.setItem(AUTH_TOKEN, data.token || "active");
    },
    logout: async () => {
      await AsyncStorage.removeItem(USER_DATA);
      await AsyncStorage.removeItem(AUTH_TOKEN);
    },
  };
};
