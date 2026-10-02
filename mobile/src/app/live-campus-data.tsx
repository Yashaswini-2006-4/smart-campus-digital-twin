import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

// ============================================================
// API CONFIGURATION
// ============================================================

// For Expo Web running on this same computer:
const API_URL =  "http://192.168.31.98:8000";

// For a physical Android phone, replace 127.0.0.1 with
// your computer's LAN IP address, for example:
// const API_URL = 'http://192.168.1.10:8000';

// ============================================================
// TYPES
// ============================================================

interface SensorData {
  id: number;
  timestamp: string;
  occupancy: number;
  energy: number;
  temperature: number;
  humidity: number;
  class_schedule: number;
}

interface SensorResponse {
  data: SensorData | null;
  status?: string;
  message?: string;
}

interface WeatherData {
  location: string;
  region?: string | null;
  country?: string | null;
  local_time?: string | null;
  temperature_c: number;
  humidity: number;
  condition: string;
  feels_like_c: number;
  wind_kph: number;
  last_updated: string;
  source: string;
  data_type: string;
}

// ============================================================
// COMPONENT
// ============================================================

export default function LiveCampusData() {
  // Manual campus readings
  const [occupancy, setOccupancy] = useState('');
  const [energy, setEnergy] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [classSchedule, setClassSchedule] = useState(true);

  // Latest database reading
  const [latestData, setLatestData] =
    useState<SensorData | null>(null);

  // Live weather
  const [weather, setWeather] =
    useState<WeatherData | null>(null);

  const [weatherLoading, setWeatherLoading] =
    useState(true);

  const [weatherError, setWeatherError] =
    useState<string | null>(null);

  // Loading and feedback
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ==========================================================
  // LOAD LATEST DATABASE READING
  // ==========================================================

  const loadLatestData = useCallback(async () => {
    try {
      setError(null);

      const response = await fetch(
        `${API_URL}/sensor-data`
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load campus data (${response.status}).`
        );
      }

      const result: SensorResponse = await response.json();

      if (result.data) {
        setLatestData(result.data);

        setOccupancy(String(result.data.occupancy));
        setEnergy(String(result.data.energy));
        setTemperature(String(result.data.temperature));
        setHumidity(String(result.data.humidity));

        setClassSchedule(
          result.data.class_schedule === 1
        );
      } else {
        setLatestData(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load campus data.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // LOAD LIVE WEATHER
  // ==========================================================

  const loadWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      setWeatherError(null);

      const response = await fetch(
        `${API_URL}/environment`
      );

      if (!response.ok) {
        let message =
          `Weather service returned ${response.status}.`;

        try {
          const result = await response.json();

          if (typeof result.detail === 'string') {
            message = result.detail;
          }
        } catch {
          // Keep the default message.
        }

        throw new Error(message);
      }

      const result: WeatherData = await response.json();

      setWeather(result);
    } catch (err) {
      setWeatherError(
        err instanceof Error
          ? err.message
          : 'Unable to load live weather.'
      );
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    void loadLatestData();
    void loadWeather();
  }, [loadLatestData, loadWeather]);

  // ==========================================================
  // SAVE MANUAL CAMPUS READING
  // ==========================================================

  const saveSensorData = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const occupancyValue = Number(occupancy);
      const energyValue = Number(energy);
      const temperatureValue = Number(temperature);
      const humidityValue = Number(humidity);

      if (
        occupancy.trim() === '' ||
        energy.trim() === '' ||
        temperature.trim() === '' ||
        humidity.trim() === ''
      ) {
        throw new Error(
          'Please fill in all campus reading fields.'
        );
      }

      if (
        !Number.isFinite(occupancyValue) ||
        !Number.isFinite(energyValue) ||
        !Number.isFinite(temperatureValue) ||
        !Number.isFinite(humidityValue)
      ) {
        throw new Error(
          'Please enter valid numeric values.'
        );
      }

      if (occupancyValue < 0) {
        throw new Error(
          'Occupancy cannot be negative.'
        );
      }

      if (energyValue < 0) {
        throw new Error(
          'Energy cannot be negative.'
        );
      }

      if (
        temperatureValue < -50 ||
        temperatureValue > 80
      ) {
        throw new Error(
          'Temperature must be between -50°C and 80°C.'
        );
      }

      if (
        humidityValue < 0 ||
        humidityValue > 100
      ) {
        throw new Error(
          'Humidity must be between 0% and 100%.'
        );
      }

      const response = await fetch(
        `${API_URL}/sensor-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            occupancy: occupancyValue,
            energy: energyValue,
            temperature: temperatureValue,
            humidity: humidityValue,
            class_schedule: classSchedule ? 1 : 0,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to save reading (${response.status}).`
        );
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        setLatestData(result.data);
      } else {
        // Reload the database if the API response
        // does not include the saved reading.
        await loadLatestData();
      }

      setSuccess(
        'Campus reading saved successfully.'
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save campus reading.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#2563EB"
        />

        <Text style={styles.loadingText}>
          Loading campus data...
        </Text>
      </View>
    );
  }

  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* HEADER */}

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>
            📡
          </Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>
            Live Campus Data
          </Text>

          <Text style={styles.subtitle}>
            Campus readings and live outdoor weather
          </Text>
        </View>
      </View>

      {/* DATABASE STATUS */}

      <View style={styles.statusCard}>
        <View style={styles.statusDot} />

        <View style={styles.statusTextContainer}>
          <Text style={styles.statusTitle}>
            Campus Database
          </Text>

          <Text style={styles.statusSubtitle}>
            View and update stored campus readings
          </Text>
        </View>

        <Text style={styles.statusCheck}>✓</Text>
      </View>

      {/* LIVE WEATHER CARD */}

      <View style={styles.weatherCard}>
        <View style={styles.weatherHeader}>
          <View style={styles.weatherIconBox}>
            <Text style={styles.weatherIcon}>
              🌦️
            </Text>
          </View>

          <View style={styles.weatherHeaderText}>
            <Text style={styles.weatherTitle}>
              Live Outdoor Weather
            </Text>

            <Text style={styles.weatherSubtitle}>
              {weather
                ? `${weather.location}${
                    weather.region
                      ? `, ${weather.region}`
                      : ''
                  }`
                : 'WeatherAPI'}
            </Text>
          </View>

          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />

            <Text style={styles.liveBadgeText}>
              LIVE
            </Text>
          </View>
        </View>

        {weatherLoading ? (
          <View style={styles.weatherLoading}>
            <ActivityIndicator
              size="small"
              color="#2563EB"
            />

            <Text style={styles.weatherLoadingText}>
              Fetching current weather...
            </Text>
          </View>
        ) : weatherError ? (
          <View style={styles.weatherErrorBox}>
            <Text style={styles.weatherErrorTitle}>
              Weather unavailable
            </Text>

            <Text style={styles.weatherErrorText}>
              {weatherError}
            </Text>

            <Pressable
              style={styles.weatherRetryButton}
              onPress={() => void loadWeather()}
            >
              <Text style={styles.weatherRetryText}>
                Retry
              </Text>
            </Pressable>
          </View>
        ) : weather ? (
          <>
            <View style={styles.weatherMain}>
              <View>
                <Text style={styles.weatherTemperature}>
                  {weather.temperature_c.toFixed(1)}°C
                </Text>

                <Text style={styles.weatherCondition}>
                  {weather.condition}
                </Text>
              </View>

              <Text style={styles.weatherBigIcon}>
                {weather.condition.toLowerCase().includes('rain')
                  ? '🌧️'
                  : weather.condition.toLowerCase().includes('cloud')
                    ? '☁️'
                    : weather.condition.toLowerCase().includes('sun')
                      ? '☀️'
                      : '🌤️'}
              </Text>
            </View>

            <View style={styles.weatherMetrics}>
              <View style={styles.weatherMetric}>
                <Text style={styles.weatherMetricIcon}>
                  💧
                </Text>

                <View>
                  <Text style={styles.weatherMetricLabel}>
                    Humidity
                  </Text>

                  <Text style={styles.weatherMetricValue}>
                    {weather.humidity}%
                  </Text>
                </View>
              </View>

              <View style={styles.weatherMetric}>
                <Text style={styles.weatherMetricIcon}>
                  🌡️
                </Text>

                <View>
                  <Text style={styles.weatherMetricLabel}>
                    Feels like
                  </Text>

                  <Text style={styles.weatherMetricValue}>
                    {weather.feels_like_c.toFixed(1)}°C
                  </Text>
                </View>
              </View>

              <View style={styles.weatherMetric}>
                <Text style={styles.weatherMetricIcon}>
                  💨
                </Text>

                <View>
                  <Text style={styles.weatherMetricLabel}>
                    Wind
                  </Text>

                  <Text style={styles.weatherMetricValue}>
                    {weather.wind_kph.toFixed(1)} km/h
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.weatherUpdated}>
              Weather observation: {weather.last_updated}
            </Text>

            <Text style={styles.weatherSource}>
              Source: {weather.source} · Outdoor conditions
            </Text>
          </>
        ) : null}

        <Pressable
          style={styles.weatherRefreshButton}
          onPress={() => void loadWeather()}
          disabled={weatherLoading}
        >
          {weatherLoading ? (
            <ActivityIndicator
              size="small"
              color="#2563EB"
            />
          ) : (
            <Text style={styles.weatherRefreshIcon}>
              ↻
            </Text>
          )}

          <Text style={styles.weatherRefreshText}>
            Refresh Weather
          </Text>
        </Pressable>
      </View>

      {/* INFORMATION */}

      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>💡</Text>

        <Text style={styles.infoText}>
          Weather values come from WeatherAPI and
          represent outdoor conditions. Campus
          readings below are entered separately
          and saved to your database.
        </Text>
      </View>

      {/* MANUAL CAMPUS INPUTS */}

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>
          Campus Readings
        </Text>

        <Text style={styles.formDescription}>
          Enter the latest campus data. These
          readings are stored for campus analysis.
        </Text>

        {/* OCCUPANCY */}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            👥 Occupancy
          </Text>

          <Text style={styles.inputDescription}>
            Number of people on campus
          </Text>

          <TextInput
            style={styles.input}
            value={occupancy}
            onChangeText={setOccupancy}
            placeholder="Example: 75"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />
        </View>

        {/* ENERGY */}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            ⚡ Energy Consumption
          </Text>

          <Text style={styles.inputDescription}>
            Campus energy reading or test value
          </Text>

          <TextInput
            style={styles.input}
            value={energy}
            onChangeText={setEnergy}
            placeholder="Example: 1500"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
        </View>

        {/* TEMPERATURE */}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            🌡️ Temperature
          </Text>

          <Text style={styles.inputDescription}>
            Manually entered campus reading in °C
          </Text>

          <TextInput
            style={styles.input}
            value={temperature}
            onChangeText={setTemperature}
            placeholder="Example: 28"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
        </View>

        {/* HUMIDITY */}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>
            💧 Humidity
          </Text>

          <Text style={styles.inputDescription}>
            Manually entered campus reading in %
          </Text>

          <TextInput
            style={styles.input}
            value={humidity}
            onChangeText={setHumidity}
            placeholder="Example: 60"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
          />
        </View>

        {/* CLASS SCHEDULE */}

        <View style={styles.scheduleRow}>
          <View style={styles.scheduleText}>
            <Text style={styles.inputLabel}>
              🎓 Classes Scheduled
            </Text>

            <Text style={styles.inputDescription}>
              Are classes currently scheduled?
            </Text>
          </View>

          <Switch
            value={classSchedule}
            onValueChange={setClassSchedule}
            trackColor={{
              false: '#D1D5DB',
              true: '#93C5FD',
            }}
            thumbColor={
              classSchedule ? '#2563EB' : '#F3F4F6'
            }
          />
        </View>

        {/* SAVE */}

        <Pressable
          style={[
            styles.saveButton,
            saving && styles.buttonDisabled,
          ]}
          onPress={() => void saveSensorData()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.saveIcon}>💾</Text>
          )}

          <Text style={styles.saveButtonText}>
            {saving
              ? 'Saving...'
              : 'Save Campus Reading'}
          </Text>
        </Pressable>
      </View>

      {/* SUCCESS */}

      {success && (
        <View style={styles.successCard}>
          <Text style={styles.successIcon}>✅</Text>

          <Text style={styles.successText}>
            {success}
          </Text>
        </View>
      )}

      {/* ERROR */}

      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      )}

      {/* LATEST STORED DATA */}

      {latestData && (
        <View style={styles.latestCard}>
          <View style={styles.latestHeader}>
            <Text style={styles.latestTitle}>
              Latest Stored Reading
            </Text>

            <Text style={styles.latestCheck}>✓</Text>
          </View>

          <View style={styles.latestGrid}>
            <View style={styles.latestMetric}>
              <Text style={styles.latestIcon}>👥</Text>

              <Text style={styles.latestLabel}>
                Occupancy
              </Text>

              <Text style={styles.latestValue}>
                {latestData.occupancy.toFixed(0)}
              </Text>
            </View>

            <View style={styles.latestMetric}>
              <Text style={styles.latestIcon}>⚡</Text>

              <Text style={styles.latestLabel}>
                Energy
              </Text>

              <Text style={styles.latestValue}>
                {latestData.energy.toFixed(0)}
              </Text>
            </View>

            <View style={styles.latestMetric}>
              <Text style={styles.latestIcon}>🌡️</Text>

              <Text style={styles.latestLabel}>
                Stored temperature
              </Text>

              <Text style={styles.latestValue}>
                {latestData.temperature.toFixed(1)}°C
              </Text>
            </View>

            <View style={styles.latestMetric}>
              <Text style={styles.latestIcon}>💧</Text>

              <Text style={styles.latestLabel}>
                Stored humidity
              </Text>

              <Text style={styles.latestValue}>
                {latestData.humidity.toFixed(0)}%
              </Text>
            </View>
          </View>

          <Text style={styles.timestamp}>
            Last saved:{' '}
            {new Date(
              latestData.timestamp
            ).toLocaleString()}
          </Text>
        </View>
      )}

      {/* ML PIPELINE */}

      <View style={styles.mlCard}>
        <Text style={styles.mlTitle}>
          🧠 Campus Intelligence Pipeline
        </Text>

        <View style={styles.pipelineRow}>
          <View style={styles.pipelineCircle}>
            <Text style={styles.pipelineIcon}>📡</Text>
          </View>

          <Text style={styles.pipelineArrow}>→</Text>

          <View style={styles.pipelineCircle}>
            <Text style={styles.pipelineIcon}>🗄️</Text>
          </View>

          <Text style={styles.pipelineArrow}>→</Text>

          <View style={styles.pipelineCircle}>
            <Text style={styles.pipelineIcon}>🤖</Text>
          </View>

          <Text style={styles.pipelineArrow}>→</Text>

          <View style={styles.pipelineCircle}>
            <Text style={styles.pipelineIcon}>💡</Text>
          </View>
        </View>

        <View style={styles.pipelineLabels}>
          <Text style={styles.pipelineLabel}>Data</Text>
          <Text style={styles.pipelineLabel}>Database</Text>
          <Text style={styles.pipelineLabel}>ML</Text>
          <Text style={styles.pipelineLabel}>Decision</Text>
        </View>

        <Text style={styles.mlDescription}>
          Stored campus readings support the existing
          ML pipeline. Live outdoor weather is shown
          separately and is not an indoor sensor reading.
        </Text>
      </View>

      {/* REFRESH DATABASE */}

      <Pressable
        style={styles.refreshButton}
        onPress={() => void loadLatestData()}
      >
        <Text style={styles.refreshIcon}>🔄</Text>

        <Text style={styles.refreshText}>
          Refresh Campus Data
        </Text>
      </Pressable>

      {/* FOOTER */}

      <Text style={styles.footerText}>
        Weather is provided by WeatherAPI. Campus
        readings are stored separately. Energy values
        are not live utility-meter measurements unless
        supplied by an actual meter.
      </Text>
    </ScrollView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 45,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerIconText: {
    fontSize: 27,
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#6B7280',
  },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },

  statusTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
  },

  statusSubtitle: {
    marginTop: 2,
    fontSize: 11,
    color: '#047857',
  },

  statusCheck: {
    fontSize: 20,
    color: '#059669',
    fontWeight: '800',
  },

  // Weather card

  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 17,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },

  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  weatherIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  weatherIcon: {
    fontSize: 24,
  },

  weatherHeaderText: {
    flex: 1,
    marginLeft: 11,
  },

  weatherTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  weatherSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 5,
  },

  liveBadgeText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
  },

  weatherLoading: {
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weatherLoadingText: {
    marginTop: 9,
    color: '#6B7280',
    fontSize: 12,
  },

  weatherErrorBox: {
    paddingVertical: 20,
  },

  weatherErrorTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
  },

  weatherErrorText: {
    marginTop: 5,
    color: '#7F1D1D',
    fontSize: 12,
    lineHeight: 18,
  },

  weatherRetryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  weatherRetryText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
  },

  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 22,
    paddingBottom: 18,
  },

  weatherTemperature: {
    fontSize: 38,
    fontWeight: '800',
    color: '#111827',
  },

  weatherCondition: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
  },

  weatherBigIcon: {
    fontSize: 47,
  },

  weatherMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 15,
  },

  weatherMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  weatherMetricIcon: {
    fontSize: 19,
    marginRight: 6,
  },

  weatherMetricLabel: {
    color: '#9CA3AF',
    fontSize: 10,
  },

  weatherMetricValue: {
    marginTop: 3,
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
  },

  weatherUpdated: {
    marginTop: 15,
    fontSize: 10,
    color: '#6B7280',
  },

  weatherSource: {
    marginTop: 4,
    fontSize: 10,
    color: '#9CA3AF',
  },

  weatherRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 11,
    paddingVertical: 12,
    marginTop: 15,
  },

  weatherRefreshIcon: {
    fontSize: 19,
    color: '#2563EB',
    marginRight: 7,
  },

  weatherRefreshText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  infoIcon: {
    fontSize: 23,
    marginRight: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 19,
    color: '#374151',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },

  formDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6B7280',
    marginBottom: 18,
  },

  inputGroup: {
    marginBottom: 17,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
  },

  inputDescription: {
    marginTop: 3,
    fontSize: 11,
    color: '#9CA3AF',
  },

  input: {
    marginTop: 9,
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 13,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
    paddingTop: 2,
  },

  scheduleText: {
    flex: 1,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  saveIcon: {
    fontSize: 17,
    marginRight: 8,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },

  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },

  successIcon: {
    fontSize: 19,
    marginRight: 9,
  },

  successText: {
    flex: 1,
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorIcon: {
    fontSize: 19,
    marginRight: 9,
  },

  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    lineHeight: 19,
  },

  latestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  latestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  latestTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  latestCheck: {
    color: '#059669',
    fontSize: 19,
    fontWeight: '800',
  },

  latestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  latestMetric: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 11,
    padding: 12,
    marginBottom: 10,
  },

  latestIcon: {
    fontSize: 20,
  },

  latestLabel: {
    marginTop: 5,
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  latestValue: {
    marginTop: 3,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  timestamp: {
    marginTop: 4,
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  mlCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 17,
    marginTop: 18,
  },

  mlTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 17,
  },

  pipelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pipelineCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pipelineIcon: {
    fontSize: 18,
  },

  pipelineArrow: {
    color: '#9CA3AF',
    fontSize: 16,
    marginHorizontal: 6,
  },

  pipelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 3,
  },

  pipelineLabel: {
    color: '#9CA3AF',
    fontSize: 9,
    fontWeight: '700',
  },

  mlDescription: {
    marginTop: 16,
    color: '#D1D5DB',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 17,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  refreshIcon: {
    fontSize: 16,
    marginRight: 7,
  },

  refreshText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },

  footerText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 10,
    lineHeight: 16,
  },
});