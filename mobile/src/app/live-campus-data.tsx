import React, { useEffect, useState } from 'react';
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
// API URL
// ============================================================

const API_URL = 'http://127.0.0.1:8000';


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


// ============================================================
// COMPONENT
// ============================================================

export default function LiveCampusData() {

  // ----------------------------------------------------------
  // Input values
  // ----------------------------------------------------------

  const [occupancy, setOccupancy] =
    useState('');

  const [energy, setEnergy] =
    useState('');

  const [temperature, setTemperature] =
    useState('');

  const [humidity, setHumidity] =
    useState('');

  const [classSchedule, setClassSchedule] =
    useState(true);


  // ----------------------------------------------------------
  // Latest stored data
  // ----------------------------------------------------------

  const [latestData, setLatestData] =
    useState<SensorData | null>(null);


  // ----------------------------------------------------------
  // Loading states
  // ----------------------------------------------------------

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  // ----------------------------------------------------------
  // Messages
  // ----------------------------------------------------------

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);


  // ==========================================================
  // LOAD LATEST DATA
  // ==========================================================

  const loadLatestData = async () => {

    try {

      setLoading(true);

      setError(null);

      const response = await fetch(
        `${API_URL}/sensor-data`
      );

      if (!response.ok) {

        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const result: SensorResponse =
        await response.json();

      if (result.data) {

        setLatestData(
          result.data
        );

        // Fill input fields with
        // current database values.

        setOccupancy(
          String(result.data.occupancy)
        );

        setEnergy(
          String(result.data.energy)
        );

        setTemperature(
          String(result.data.temperature)
        );

        setHumidity(
          String(result.data.humidity)
        );

        setClassSchedule(
          result.data.class_schedule === 1
        );
      }

    } catch (err) {

      console.error(
        'Sensor data error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load sensor data.'
      );

    } finally {

      setLoading(false);
    }
  };


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadLatestData();

  }, []);


  // ==========================================================
  // SAVE SENSOR DATA
  // ==========================================================

  const saveSensorData = async () => {

    try {

      setSaving(true);

      setError(null);

      setSuccess(null);


      // ------------------------------------------------------
      // Validate inputs
      // ------------------------------------------------------

      const occupancyValue =
        Number(occupancy);

      const energyValue =
        Number(energy);

      const temperatureValue =
        Number(temperature);

      const humidityValue =
        Number(humidity);


      if (
        occupancy.trim() === '' ||
        energy.trim() === '' ||
        temperature.trim() === '' ||
        humidity.trim() === ''
      ) {

        throw new Error(
          'Please fill in all sensor values.'
        );
      }


      if (
        Number.isNaN(occupancyValue) ||
        Number.isNaN(energyValue) ||
        Number.isNaN(temperatureValue) ||
        Number.isNaN(humidityValue)
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


      // ------------------------------------------------------
      // POST to FastAPI
      // ------------------------------------------------------

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

            class_schedule:
              classSchedule ? 1 : 0,

          }),
        }
      );


      if (!response.ok) {

        throw new Error(
          `Server returned ${response.status}`
        );
      }


      const result =
        await response.json();


      if (result.error) {

        throw new Error(
          result.error
        );
      }


      // ------------------------------------------------------
      // Update latest data
      // ------------------------------------------------------

      if (result.data) {

        setLatestData(
          result.data
        );
      }


      setSuccess(
        'Sensor reading saved successfully.'
      );

    } catch (err) {

      console.error(
        'Save sensor data error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save sensor data.'
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
      contentContainerStyle={
        styles.contentContainer
      }
      keyboardShouldPersistTaps="handled"
    >

      {/* ====================================================
          HEADER
      ==================================================== */}

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
            Update campus sensor readings
          </Text>

        </View>

      </View>


      {/* ====================================================
          STATUS
      ==================================================== */}

      <View style={styles.statusCard}>

        <View style={styles.statusDot} />

        <View style={styles.statusTextContainer}>

          <Text style={styles.statusTitle}>
            Database Connected
          </Text>

          <Text style={styles.statusSubtitle}>
            Sensor data is stored persistently
          </Text>

        </View>

        <Text style={styles.statusCheck}>
          ✓
        </Text>

      </View>


      {/* ====================================================
          INFO
      ==================================================== */}

      <View style={styles.infoCard}>

        <Text style={styles.infoIcon}>
          💡
        </Text>

        <Text style={styles.infoText}>
          Enter the latest campus conditions.
          The stored values will be used by the
          ML models for anomaly detection,
          health scoring and recommendations.
        </Text>

      </View>


      {/* ====================================================
          SENSOR INPUTS
      ==================================================== */}

      <View style={styles.formCard}>

        <Text style={styles.sectionTitle}>
          Sensor Readings
        </Text>


        {/* --------------------------------------------------
            OCCUPANCY
        -------------------------------------------------- */}

        <View style={styles.inputGroup}>

          <Text style={styles.inputLabel}>
            👥 Occupancy
          </Text>

          <Text style={styles.inputDescription}>
            Number of people currently on campus
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


        {/* --------------------------------------------------
            ENERGY
        -------------------------------------------------- */}

        <View style={styles.inputGroup}>

          <Text style={styles.inputLabel}>
            ⚡ Energy Consumption
          </Text>

          <Text style={styles.inputDescription}>
            Current campus energy usage
          </Text>

          <TextInput
            style={styles.input}
            value={energy}
            onChangeText={setEnergy}
            placeholder="Example: 1500"
            placeholderTextColor="#9CA3AF"
            keyboardType="numeric"
          />

        </View>


        {/* --------------------------------------------------
            TEMPERATURE
        -------------------------------------------------- */}

        <View style={styles.inputGroup}>

          <Text style={styles.inputLabel}>
            🌡️ Temperature
          </Text>

          <Text style={styles.inputDescription}>
            Current temperature in °C
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


        {/* --------------------------------------------------
            HUMIDITY
        -------------------------------------------------- */}

        <View style={styles.inputGroup}>

          <Text style={styles.inputLabel}>
            💧 Humidity
          </Text>

          <Text style={styles.inputDescription}>
            Current humidity percentage
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


        {/* --------------------------------------------------
            CLASS SCHEDULE
        -------------------------------------------------- */}

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
            onValueChange={
              setClassSchedule
            }
            trackColor={{
              false: '#D1D5DB',
              true: '#93C5FD',
            }}
            thumbColor={
              classSchedule
                ? '#2563EB'
                : '#F3F4F6'
            }
          />

        </View>


        {/* --------------------------------------------------
            SAVE BUTTON
        -------------------------------------------------- */}

        <Pressable
          style={[
            styles.saveButton,
            saving &&
              styles.saveButtonDisabled,
          ]}
          onPress={saveSensorData}
          disabled={saving}
        >

          {saving ? (

            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />

          ) : (

            <Text style={styles.saveIcon}>
              💾
            </Text>

          )}

          <Text style={styles.saveButtonText}>

            {saving
              ? 'Saving...'
              : 'Save Sensor Reading'}

          </Text>

        </Pressable>

      </View>


      {/* ====================================================
          SUCCESS
      ==================================================== */}

      {success && (

        <View style={styles.successCard}>

          <Text style={styles.successIcon}>
            ✅
          </Text>

          <Text style={styles.successText}>
            {success}
          </Text>

        </View>

      )}


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (

        <View style={styles.errorCard}>

          <Text style={styles.errorIcon}>
            ⚠️
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

        </View>

      )}


      {/* ====================================================
          LATEST DATA
      ==================================================== */}

      {latestData && (

        <View style={styles.latestCard}>

          <View style={styles.latestHeader}>

            <Text style={styles.latestTitle}>
              Latest Stored Reading
            </Text>

            <Text style={styles.latestCheck}>
              ✓
            </Text>

          </View>


          <View style={styles.latestGrid}>

            {/* OCCUPANCY */}

            <View style={styles.latestMetric}>

              <Text style={styles.latestIcon}>
                👥
              </Text>

              <Text style={styles.latestLabel}>
                Occupancy
              </Text>

              <Text style={styles.latestValue}>
                {latestData.occupancy.toFixed(0)}
              </Text>

            </View>


            {/* ENERGY */}

            <View style={styles.latestMetric}>

              <Text style={styles.latestIcon}>
                ⚡
              </Text>

              <Text style={styles.latestLabel}>
                Energy
              </Text>

              <Text style={styles.latestValue}>
                {latestData.energy.toFixed(0)}
              </Text>

            </View>


            {/* TEMPERATURE */}

            <View style={styles.latestMetric}>

              <Text style={styles.latestIcon}>
                🌡️
              </Text>

              <Text style={styles.latestLabel}>
                Temperature
              </Text>

              <Text style={styles.latestValue}>
                {latestData.temperature.toFixed(1)}°C
              </Text>

            </View>


            {/* HUMIDITY */}

            <View style={styles.latestMetric}>

              <Text style={styles.latestIcon}>
                💧
              </Text>

              <Text style={styles.latestLabel}>
                Humidity
              </Text>

              <Text style={styles.latestValue}>
                {latestData.humidity.toFixed(0)}%
              </Text>

            </View>

          </View>


          <Text style={styles.timestamp}>
            Last updated:{' '}
            {new Date(
              latestData.timestamp
            ).toLocaleString()}
          </Text>

        </View>

      )}


      {/* ====================================================
          ML INFORMATION
      ==================================================== */}

      <View style={styles.mlCard}>

        <Text style={styles.mlTitle}>
          🧠 ML Pipeline
        </Text>


        <View style={styles.pipelineRow}>

          <View style={styles.pipelineCircle}>
            <Text style={styles.pipelineIcon}>
              📡
            </Text>
          </View>

          <Text style={styles.pipelineArrow}>
            →
          </Text>

          <View style={styles.pipelineCircle}>
            <Text style={styles.pipelineIcon}>
              🗄️
            </Text>
          </View>

          <Text style={styles.pipelineArrow}>
            →
          </Text>

          <View style={styles.pipelineCircle}>
            <Text style={styles.pipelineIcon}>
              🤖
            </Text>
          </View>

          <Text style={styles.pipelineArrow}>
            →
          </Text>

          <View style={styles.pipelineCircle}>
            <Text style={styles.pipelineIcon}>
              💡
            </Text>
          </View>

        </View>


        <View style={styles.pipelineLabels}>

          <Text style={styles.pipelineLabel}>
            Sensor
          </Text>

          <Text style={styles.pipelineLabel}>
            Database
          </Text>

          <Text style={styles.pipelineLabel}>
            ML
          </Text>

          <Text style={styles.pipelineLabel}>
            Decision
          </Text>

        </View>


        <Text style={styles.mlDescription}>
          New sensor readings are stored in the
          database and used by the ML pipeline
          for campus analysis.
        </Text>

      </View>


      {/* ====================================================
          REFRESH
      ==================================================== */}

      <Pressable
        style={styles.refreshButton}
        onPress={loadLatestData}
      >

        <Text style={styles.refreshIcon}>
          🔄
        </Text>

        <Text style={styles.refreshText}>
          Refresh Latest Data
        </Text>

      </Pressable>


      {/* ====================================================
          FOOTER
      ==================================================== */}

      <Text style={styles.footerText}>
        Sensor values are currently simulated for
        development and testing.
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


  // ==========================================================
  // LOADING
  // ==========================================================

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


  // ==========================================================
  // HEADER
  // ==========================================================

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


  // ==========================================================
  // STATUS
  // ==========================================================

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


  // ==========================================================
  // INFO
  // ==========================================================

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


  // ==========================================================
  // FORM
  // ==========================================================

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
    marginBottom: 17,
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


  // ==========================================================
  // CLASS SCHEDULE
  // ==========================================================

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
    paddingTop: 2,
  },

  scheduleText: {
    flex: 1,
  },


  // ==========================================================
  // SAVE
  // ==========================================================

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
  },

  saveButtonDisabled: {
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
  },


  // ==========================================================
  // SUCCESS
  // ==========================================================

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


  // ==========================================================
  // ERROR
  // ==========================================================

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


  // ==========================================================
  // LATEST DATA
  // ==========================================================

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


  // ==========================================================
  // ML PIPELINE
  // ==========================================================

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


  // ==========================================================
  // REFRESH
  // ==========================================================

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


  // ==========================================================
  // FOOTER
  // ==========================================================

  footerText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 10,
    lineHeight: 16,
  },

});