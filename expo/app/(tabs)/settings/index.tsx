import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import {
  Plug,
  User,
  Lock,
  MapPin,
  CheckCircle,
  XCircle,
  ChevronDown,
  Wifi,
  ScanFace,
  KeyRound,
  LogOut,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useCrm } from "@/providers/CrmProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { CrmConfig, YandexCity } from "@/types/crm";
import PulsingDot from "@/components/PulsingDot";
import { testConnection, fetchCities } from "@/utils/yandexTicketsApi";

export default function SettingsScreen() {
  const { config, updateConfig } = useCrm();
  const { biometricsEnabled, biometricsAvailable, toggleBiometrics, changePin, lock } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [login, setLogin] = useState(config.login ?? "");
  const [password, setPassword] = useState(config.password ?? "");
  const [cityId, setCityId] = useState(config.cityId ? String(config.cityId) : "");
  const [cities, setCities] = useState<YandexCity[]>([]);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = useCallback(async () => {
    if (!login || !password) {
      Alert.alert("Ошибка", "Введите логин и пароль");
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsTesting(true);
    setTestResult(null);

    const tempConfig: CrmConfig = {
      provider: "yandex_tickets",
      apiKey: "",
      isConnected: false,
      login,
      password,
      cityId: cityId ? Number(cityId) : undefined,
    };

    try {
      const result = await testConnection(tempConfig);
      setTestResult(result);
      if (result.success && result.cities) {
        setCities(result.cities);
        if (!cityId && result.cities.length > 0) {
          setCityId(String(result.cities[0].id));
        }
      }
      void Haptics.notificationAsync(
        result.success
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    } catch {
      setTestResult({ success: false, message: "Ошибка подключения" });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsTesting(false);
    }
  }, [login, password, cityId]);

  const handleLoadCities = useCallback(async () => {
    if (!login || !password) {
      Alert.alert("Ошибка", "Сначала введите логин и пароль");
      return;
    }

    const tempConfig: CrmConfig = {
      provider: "yandex_tickets",
      apiKey: "",
      isConnected: false,
      login,
      password,
    };

    try {
      const result = await fetchCities(tempConfig);
      setCities(result);
      setShowCityPicker(true);
    } catch {
      Alert.alert("Ошибка", "Не удалось загрузить список городов. Проверьте логин и пароль.");
    }
  }, [login, password]);

  const handleSave = useCallback(() => {
    if (!login || !password || !cityId) {
      Alert.alert("Ошибка", "Заполните все поля: логин, пароль, ID города");
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newConfig: CrmConfig = {
      provider: "yandex_tickets",
      apiKey: `${login}:${cityId}`,
      isConnected: true,
      lastSync: new Date().toISOString(),
      login,
      password,
      cityId: Number(cityId),
    };
    updateConfig(newConfig);
    Alert.alert("Сохранено", "Подключение к Яндекс.Билеты настроено. Данные обновятся в течение минуты.");
  }, [login, password, cityId, updateConfig]);

  const handleDisconnect = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Отключить API?", "Будут отображаться демо-данные.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Отключить",
        style: "destructive",
        onPress: () => {
          setLogin("");
          setPassword("");
          setCityId("");
          setCities([]);
          setTestResult(null);
          updateConfig({
            provider: "yandex_tickets",
            apiKey: "",
            isConnected: false,
          });
        },
      },
    ]);
  }, [updateConfig]);

  const selectedCity = cities.find((c) => String(c.id) === cityId);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Настройки" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            {config.isConnected ? (
              <>
                <PulsingDot color={colors.accent} size={8} />
                <Text style={styles.statusConnected}>Подключено</Text>
              </>
            ) : (
              <>
                <XCircle size={18} color={colors.textMuted} />
                <Text style={styles.statusDisconnected}>Не подключено</Text>
              </>
            )}
          </View>
          <Text style={styles.statusHint}>
            {config.isConnected
              ? `Яндекс.Билеты — город ${config.cityId ?? "?"} — обновление каждые 60с`
              : "Используются демо-данные. Подключите Яндекс.Билеты ниже."}
          </Text>
        </View>

        <View style={styles.providerBadge}>
          <Plug size={16} color={colors.accent} />
          <Text style={styles.providerText}>Яндекс.Билеты CRM API</Text>
        </View>

        <Text style={styles.sectionTitle}>Логин</Text>
        <View style={styles.inputRow}>
          <User size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Логин от API"
            placeholderTextColor={colors.textMuted}
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            testID="login-input"
          />
        </View>

        <Text style={styles.sectionTitle}>Пароль</Text>
        <View style={styles.inputRow}>
          <Lock size={18} color={colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Пароль от API"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            testID="password-input"
          />
        </View>

        <Text style={styles.sectionTitle}>Город</Text>
        <TouchableOpacity
          style={styles.cityPickerBtn}
          onPress={handleLoadCities}
          activeOpacity={0.7}
        >
          <View style={styles.pickerLeft}>
            <MapPin size={18} color={colors.textMuted} />
            <Text style={styles.cityPickerText}>
              {selectedCity ? selectedCity.name : cityId ? `ID: ${cityId}` : "Выбрать город"}
            </Text>
          </View>
          <ChevronDown
            size={18}
            color={colors.textMuted}
            style={{ transform: [{ rotate: showCityPicker ? "180deg" : "0deg" }] }}
          />
        </TouchableOpacity>

        {showCityPicker && cities.length > 0 && (
          <View style={styles.optionsList}>
            {cities.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={[
                  styles.optionItem,
                  String(city.id) === cityId && styles.optionItemActive,
                ]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setCityId(String(city.id));
                  setShowCityPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    String(city.id) === cityId && styles.optionLabelActive,
                  ]}
                >
                  {city.name}
                </Text>
                {String(city.id) === cityId && (
                  <CheckCircle size={16} color={colors.accent} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.manualCityRow}>
          <Text style={styles.manualCityLabel}>или введите ID города вручную:</Text>
          <TextInput
            style={styles.cityIdInput}
            placeholder="123"
            placeholderTextColor={colors.textMuted}
            value={cityId}
            onChangeText={setCityId}
            keyboardType="number-pad"
            testID="city-id-input"
          />
        </View>

        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTestConnection}
          activeOpacity={0.8}
          disabled={isTesting}
        >
          {isTesting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Wifi size={16} color={colors.text} />
              <Text style={styles.testBtnText}>Проверить подключение</Text>
            </>
          )}
        </TouchableOpacity>

        {testResult && (
          <View style={[styles.testResultCard, testResult.success ? styles.testResultSuccess : styles.testResultError]}>
            <Text style={[styles.testResultText, testResult.success ? styles.testResultTextSuccess : styles.testResultTextError]}>
              {testResult.message}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>Сохранить и подключить</Text>
        </TouchableOpacity>

        {config.isConnected && (
          <TouchableOpacity
            style={styles.disconnectBtn}
            onPress={handleDisconnect}
            activeOpacity={0.8}
          >
            <Text style={styles.disconnectBtnText}>Отключить</Text>
          </TouchableOpacity>
        )}

        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>Безопасность</Text>

          {biometricsAvailable && Platform.OS !== "web" && (
            <View style={styles.securityRow}>
              <View style={styles.securityRowLeft}>
                <ScanFace size={20} color={colors.accent} />
                <View>
                  <Text style={styles.securityLabel}>Face ID / Биометрия</Text>
                  <Text style={styles.securityHint}>Быстрый вход без PIN-кода</Text>
                </View>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={(val) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void toggleBiometrics(val);
                }}
                trackColor={{ false: colors.surfaceAccent, true: colors.accent }}
                thumbColor="#FFFFFF"
                testID="biometrics-toggle"
              />
            </View>
          )}

          <TouchableOpacity
            style={styles.securityBtn}
            onPress={() => {
              if (Alert.prompt) {
                Alert.prompt(
                  "Новый PIN",
                  "Введите новый 4-значный PIN-код",
                  (text) => {
                    if (text && text.length === 4 && /^\d{4}$/.test(text)) {
                      void changePin(text);
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert("Готово", "PIN-код изменён");
                    } else {
                      Alert.alert("Ошибка", "PIN должен быть 4-значным числом");
                    }
                  },
                  "secure-text"
                );
                return;
              }

              Alert.alert("Смена PIN", "Заблокируйте и заново войдите для смены PIN-кода");
            }}
            activeOpacity={0.7}
          >
            <KeyRound size={18} color={colors.textSecondary} />
            <Text style={styles.securityBtnText}>Сменить PIN-код</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.securityBtn, styles.securityBtnDanger]}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              lock();
            }}
            activeOpacity={0.7}
          >
            <LogOut size={18} color={colors.danger} />
            <Text style={[styles.securityBtnText, styles.securityBtnTextDanger]}>Заблокировать</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Как это работает</Text>
          <Text style={styles.infoText}>
            Envo Sales Tracker подключается к API Яндекс.Билеты и опрашивает данные каждые 60 секунд.
          </Text>
          <Text style={styles.infoText}>
            Для подключения нужны логин и пароль, предоставленные службой поддержки Яндекс.Билеты при настройке CRM API.
          </Text>
          <Text style={styles.infoText}>
            Авторизация формируется по схеме: login:sha1(md5(password)+timestamp):timestamp
          </Text>
          <Text style={styles.infoText}>
            Прибыль = выручка − 6% сбор, затем − 13% налог от оставшейся суммы.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"], _isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      shadowColor: colors.glassShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
    },
    statusConnected: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.accent,
    },
    statusDisconnected: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textMuted,
    },
    statusHint: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    providerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.accentBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 20,
    },
    providerText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.accent,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.textSecondary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      marginBottom: 10,
      marginTop: 4,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      marginBottom: 16,
      paddingHorizontal: 14,
    },
    inputIcon: {
      marginRight: 10,
    },
    input: {
      flex: 1,
      height: 50,
      fontSize: 15,
      color: colors.text,
    },
    cityPickerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      marginBottom: 10,
    },
    pickerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    cityPickerText: {
      fontSize: 15,
      color: colors.text,
      fontWeight: "500" as const,
    },
    optionsList: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      marginBottom: 10,
      overflow: "hidden",
      maxHeight: 250,
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    optionItemActive: {
      backgroundColor: colors.accentBg,
    },
    optionLabel: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.textSecondary,
    },
    optionLabelActive: {
      color: colors.accent,
      fontWeight: "600" as const,
    },
    manualCityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 20,
    },
    manualCityLabel: {
      fontSize: 12,
      color: colors.textMuted,
      flex: 1,
    },
    cityIdInput: {
      width: 80,
      height: 40,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      textAlign: "center" as const,
      fontSize: 15,
      color: colors.text,
    },
    testBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.surfaceAccent,
      borderRadius: 16,
      paddingVertical: 14,
      marginBottom: 12,
    },
    testBtnText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.text,
    },
    testResultCard: {
      borderRadius: 14,
      padding: 12,
      marginBottom: 12,
    },
    testResultSuccess: {
      backgroundColor: colors.accentBg,
    },
    testResultError: {
      backgroundColor: colors.dangerBg,
    },
    testResultText: {
      fontSize: 13,
      fontWeight: "500" as const,
      textAlign: "center" as const,
    },
    testResultTextSuccess: {
      color: colors.accent,
    },
    testResultTextError: {
      color: colors.danger,
    },
    saveBtn: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 8,
      marginBottom: 12,
    },
    saveBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: "#FFFFFF",
    },
    disconnectBtn: {
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: colors.dangerBg,
      marginBottom: 24,
    },
    disconnectBtnText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.danger,
    },
    securitySection: {
      marginBottom: 24,
    },
    securityRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      marginBottom: 10,
    },
    securityRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    securityLabel: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.text,
    },
    securityHint: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    securityBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      marginBottom: 10,
    },
    securityBtnText: {
      fontSize: 15,
      fontWeight: "500" as const,
      color: colors.textSecondary,
    },
    securityBtnDanger: {
      borderColor: colors.dangerBg,
    },
    securityBtnTextDanger: {
      color: colors.danger,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    infoTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.text,
      marginBottom: 10,
    },
    infoText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginBottom: 8,
    },
  });
}
