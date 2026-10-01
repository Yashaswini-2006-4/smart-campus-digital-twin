import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';


// ============================================================
// API URL
// ============================================================

const API_URL = 'http://127.0.0.1:8000';


// ============================================================
// TYPES
// ============================================================

interface SimulationResponse {
  base: {
    occupancy: number;
    energy: number;
  };

  simulation: {
    occupancy_change: number;
    energy_change: number;
  };

  predicted: {
    occupancy: number;
    energy: number;
  };

  model_status: string;
}


// ============================================================
// COMPONENT
// ============================================================

export default function WhatIfSimulation() {

  // ----------------------------------------------------------
  // User input
  // ----------------------------------------------------------

  const [occupancyChange, setOccupancyChange] =
    useState(0);

  const [energyChange, setEnergyChange] =
    useState(0);


  // ----------------------------------------------------------
  // API response
  // ----------------------------------------------------------

  const [result, setResult] =
    useState<SimulationResponse | null>(null);


  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------

  const [loading, setLoading] =
    useState(false);


  // ----------------------------------------------------------
  // Error
  // ----------------------------------------------------------

  const [error, setError] =
    useState<string | null>(null);


  // ==========================================================
  // RUN SIMULATION
  // ==========================================================

  const runSimulation = async () => {

    try {

      setLoading(true);

      setError(null);

      setResult(null);


      const response = await fetch(
        `${API_URL}/what-if`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            occupancy_change: occupancyChange,
            energy_change: energyChange,
          }),
        }
      );


      if (!response.ok) {

        throw new Error(
          `Server returned ${response.status}`
        );
      }


      const data =
        await response.json();


      if (data.error) {

        throw new Error(
          data.error
        );
      }


      setResult(data);

    } catch (err) {

      console.error(
        'What-if simulation error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to run simulation.'
      );

    } finally {

      setLoading(false);

    }

  };


  // ==========================================================
  // RESET
  // ==========================================================

  const resetSimulation = () => {

    setOccupancyChange(0);

    setEnergyChange(0);

    setResult(null);

    setError(null);

  };


  // ==========================================================
  // FORMAT CHANGE
  // ==========================================================

  const formatChange = (
    value: number
  ) => {

    if (value > 0) {

      return `+${value}%`;

    }

    return `${value}%`;

  };


  // ==========================================================
  // MAIN UI
  // ==========================================================

  return (

    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
    >

      {/* ====================================================
          HEADER
      ==================================================== */}

      <View style={styles.header}>

        <View style={styles.headerIcon}>

          <Text style={styles.headerIconText}>
            🔮
          </Text>

        </View>


        <View style={styles.headerText}>

          <Text style={styles.title}>
            What-If Simulation
          </Text>

          <Text style={styles.subtitle}>
            Simulate future campus conditions
          </Text>

        </View>

      </View>


      {/* ====================================================
          DESCRIPTION
      ==================================================== */}

      <View style={styles.infoCard}>

        <Text style={styles.infoIcon}>
          🧠
        </Text>

        <Text style={styles.infoText}>
          Change occupancy and energy conditions
          to see how the campus metrics would
          change under the selected scenario.
        </Text>

      </View>


      {/* ====================================================
          OCCUPANCY CONTROL
      ==================================================== */}

      <View style={styles.controlCard}>

        <View style={styles.controlHeader}>

          <View>

            <Text style={styles.controlTitle}>
              👥 Occupancy Change
            </Text>

            <Text style={styles.controlDescription}>
              Adjust expected campus occupancy
            </Text>

          </View>


          <Text
            style={[
              styles.changeValue,
              occupancyChange > 0
                ? styles.positive
                : occupancyChange < 0
                ? styles.negative
                : styles.neutral,
            ]}
          >
            {formatChange(
              occupancyChange
            )}
          </Text>

        </View>


        {/* --------------------------------------------------
            QUICK BUTTONS
        -------------------------------------------------- */}

        <View style={styles.buttonRow}>

          <Pressable
            style={styles.smallButton}
            onPress={() =>
              setOccupancyChange(
                Math.max(
                  -50,
                  occupancyChange - 10
                )
              )
            }
          >

            <Text style={styles.smallButtonText}>
              −10%
            </Text>

          </Pressable>


          <Pressable
            style={styles.smallButton}
            onPress={() =>
              setOccupancyChange(0)
            }
          >

            <Text style={styles.smallButtonText}>
              Reset
            </Text>

          </Pressable>


          <Pressable
            style={styles.smallButton}
            onPress={() =>
              setOccupancyChange(
                Math.min(
                  50,
                  occupancyChange + 10
                )
              )
            }
          >

            <Text style={styles.smallButtonText}>
              +10%
            </Text>

          </Pressable>

        </View>


        {/* --------------------------------------------------
            RANGE DISPLAY
        -------------------------------------------------- */}

        <View style={styles.rangeContainer}>

          <Text style={styles.rangeText}>
            -50%
          </Text>

          <View style={styles.rangeTrack}>

            <View
              style={[
                styles.rangeProgress,
                {
                  width: `${
                    ((occupancyChange + 50) / 100)
                    * 100
                  }%`,
                },
              ]}
            />

          </View>

          <Text style={styles.rangeText}>
            +50%
          </Text>

        </View>

      </View>


      {/* ====================================================
          ENERGY CONTROL
      ==================================================== */}

      <View style={styles.controlCard}>

        <View style={styles.controlHeader}>

          <View>

            <Text style={styles.controlTitle}>
              ⚡ Energy Change
            </Text>

            <Text style={styles.controlDescription}>
              Adjust expected energy consumption
            </Text>

          </View>


          <Text
            style={[
              styles.changeValue,
              energyChange > 0
                ? styles.positive
                : energyChange < 0
                ? styles.negative
                : styles.neutral,
            ]}
          >
            {formatChange(
              energyChange
            )}
          </Text>

        </View>


        {/* --------------------------------------------------
            QUICK BUTTONS
        -------------------------------------------------- */}

        <View style={styles.buttonRow}>

          <Pressable
            style={styles.smallButton}
            onPress={() =>
              setEnergyChange(
                Math.max(
                  -50,
                  energyChange - 10
                )
              )
            }
          >

            <Text style={styles.smallButtonText}>
              −10%
            </Text>

          </Pressable>


          <Pressable
            style={styles.smallButton}
            onPress={() =>
              setEnergyChange(0)
            }
          >

            <Text style={styles.smallButtonText}>
              Reset
            </Text>

          </Pressable>


          <Pressable
            style={styles.smallButton}
            onPress={() =>
              setEnergyChange(
                Math.min(
                  50,
                  energyChange + 10
                )
              )
            }
          >

            <Text style={styles.smallButtonText}>
              +10%
            </Text>

          </Pressable>

        </View>


        {/* --------------------------------------------------
            RANGE DISPLAY
        -------------------------------------------------- */}

        <View style={styles.rangeContainer}>

          <Text style={styles.rangeText}>
            -50%
          </Text>

          <View style={styles.rangeTrack}>

            <View
              style={[
                styles.rangeProgress,
                {
                  width: `${
                    ((energyChange + 50) / 100)
                    * 100
                  }%`,
                },
              ]}
            />

          </View>

          <Text style={styles.rangeText}>
            +50%
          </Text>

        </View>

      </View>


      {/* ====================================================
          SIMULATION BUTTON
      ==================================================== */}

      <Pressable
        style={[
          styles.simulateButton,
          loading &&
            styles.simulateButtonDisabled,
        ]}
        onPress={runSimulation}
        disabled={loading}
      >

        {loading ? (

          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />

        ) : (

          <Text style={styles.simulateIcon}>
            ▶
          </Text>

        )}


        <Text style={styles.simulateButtonText}>

          {loading
            ? 'Running Simulation...'
            : 'Run What-If Simulation'}

        </Text>

      </Pressable>


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (

        <View style={styles.errorCard}>

          <Text style={styles.errorIcon}>
            ⚠️
          </Text>

          <View style={styles.errorContent}>

            <Text style={styles.errorTitle}>
              Simulation Failed
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

          </View>

        </View>

      )}


      {/* ====================================================
          RESULTS
      ==================================================== */}

      {result && (

        <View style={styles.resultsContainer}>

          <Text style={styles.resultsTitle}>
            Simulation Results
          </Text>


          {/* ------------------------------------------------
              BASE VS PREDICTED
          ------------------------------------------------ */}

          <View style={styles.comparisonCard}>

            {/* OCCUPANCY */}

            <View style={styles.comparisonSection}>

              <View style={styles.comparisonHeader}>

                <Text style={styles.comparisonIcon}>
                  👥
                </Text>

                <Text style={styles.comparisonTitle}>
                  Occupancy
                </Text>

              </View>


              <View style={styles.valuesRow}>

                <View style={styles.valueBox}>

                  <Text style={styles.valueLabel}>
                    Current
                  </Text>

                  <Text style={styles.baseValue}>
                    {result.base.occupancy.toFixed(0)}
                  </Text>

                </View>


                <Text style={styles.arrow}>
                  →
                </Text>


                <View style={styles.valueBox}>

                  <Text style={styles.valueLabel}>
                    Simulated
                  </Text>

                  <Text style={styles.predictedValue}>
                    {result.predicted.occupancy.toFixed(0)}
                  </Text>

                </View>

              </View>

              <Text
                style={[
                  styles.resultChange,
                  result.predicted.occupancy >
                    result.base.occupancy
                    ? styles.positive
                    : result.predicted.occupancy <
                        result.base.occupancy
                    ? styles.negative
                    : styles.neutral,
                ]}
              >

                {formatChange(
                  result.simulation
                    .occupancy_change
                )}

              </Text>

            </View>


            <View style={styles.divider} />


            {/* ENERGY */}

            <View style={styles.comparisonSection}>

              <View style={styles.comparisonHeader}>

                <Text style={styles.comparisonIcon}>
                  ⚡
                </Text>

                <Text style={styles.comparisonTitle}>
                  Energy
                </Text>

              </View>


              <View style={styles.valuesRow}>

                <View style={styles.valueBox}>

                  <Text style={styles.valueLabel}>
                    Current
                  </Text>

                  <Text style={styles.baseValue}>
                    {result.base.energy.toFixed(0)}
                  </Text>

                </View>


                <Text style={styles.arrow}>
                  →
                </Text>


                <View style={styles.valueBox}>

                  <Text style={styles.valueLabel}>
                    Simulated
                  </Text>

                  <Text style={styles.predictedValue}>
                    {result.predicted.energy.toFixed(0)}
                  </Text>

                </View>

              </View>


              <Text
                style={[
                  styles.resultChange,
                  result.predicted.energy >
                    result.base.energy
                    ? styles.negative
                    : result.predicted.energy <
                        result.base.energy
                    ? styles.positive
                    : styles.neutral,
                ]}
              >

                {formatChange(
                  result.simulation
                    .energy_change
                )}

              </Text>

            </View>

          </View>


          {/* ------------------------------------------------
              INTERPRETATION
          ------------------------------------------------ */}

          <View style={styles.interpretationCard}>

            <Text style={styles.interpretationTitle}>
              🧠 Simulation Insight
            </Text>


            <Text style={styles.interpretationText}>

              {result.simulation
                .occupancy_change > 0
                ? 'Higher occupancy has been simulated. '
                : result.simulation
                    .occupancy_change < 0
                ? 'Lower occupancy has been simulated. '
                : 'Occupancy remains unchanged. '}

              {result.simulation
                .energy_change > 0
                ? 'Energy consumption has been increased in this scenario.'
                : result.simulation
                    .energy_change < 0
                ? 'Energy consumption has been reduced in this scenario.'
                : 'Energy consumption remains unchanged in this scenario.'}

            </Text>

          </View>


          {/* ------------------------------------------------
              MODEL STATUS
          ------------------------------------------------ */}

          <View style={styles.modelStatusCard}>

            <Text style={styles.modelStatusIcon}>
              🤖
            </Text>

            <View style={styles.modelStatusText}>

              <Text style={styles.modelStatusTitle}>
                Model Status
              </Text>

              <Text style={styles.modelStatusValue}>
                {result.model_status}
              </Text>

            </View>

            <Text style={styles.checkIcon}>
              ✓
            </Text>

          </View>


          {/* ------------------------------------------------
              RESET
          ------------------------------------------------ */}

          <Pressable
            style={styles.resetButton}
            onPress={resetSimulation}
          >

            <Text style={styles.resetButtonText}>
              Reset Simulation
            </Text>

          </Pressable>

        </View>

      )}


      {/* ====================================================
          FOOTER
      ==================================================== */}

      <View style={styles.footer}>

        <Text style={styles.footerText}>
          ⚠️ Simulation values are scenario estimates
          based on the current ML-backed prototype.
        </Text>

      </View>

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
    backgroundColor: '#EDE9FE',
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
  // INFO
  // ==========================================================

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  infoIcon: {
    fontSize: 25,
    marginRight: 11,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: '#6B7280',
  },


  // ==========================================================
  // CONTROLS
  // ==========================================================

  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  controlTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  controlDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
  },

  changeValue: {
    fontSize: 22,
    fontWeight: '800',
  },

  positive: {
    color: '#059669',
  },

  negative: {
    color: '#DC2626',
  },

  neutral: {
    color: '#6B7280',
  },


  // ==========================================================
  // BUTTONS
  // ==========================================================

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },

  smallButton: {
    width: '31%',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  smallButtonText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
  },


  // ==========================================================
  // RANGE
  // ==========================================================

  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },

  rangeText: {
    fontSize: 10,
    color: '#9CA3AF',
    width: 38,
  },

  rangeTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },

  rangeProgress: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 5,
  },


  // ==========================================================
  // SIMULATE
  // ==========================================================

  simulateButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 13,
    paddingVertical: 15,
    marginTop: 4,
    marginBottom: 18,
  },

  simulateButtonDisabled: {
    opacity: 0.7,
  },

  simulateIcon: {
    color: '#FFFFFF',
    fontSize: 14,
    marginRight: 8,
  },

  simulateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },


  // ==========================================================
  // ERROR
  // ==========================================================

  errorCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 15,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#FECACA',
  },

  errorIcon: {
    fontSize: 23,
    marginRight: 10,
  },

  errorContent: {
    flex: 1,
  },

  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#991B1B',
  },

  errorText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#B91C1C',
  },


  // ==========================================================
  // RESULTS
  // ==========================================================

  resultsContainer: {
    marginTop: 4,
  },

  resultsTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },

  comparisonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  comparisonSection: {
    paddingVertical: 3,
  },

  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  comparisonIcon: {
    fontSize: 21,
  },

  comparisonTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },

  valuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },

  valueBox: {
    width: '38%',
    alignItems: 'center',
  },

  valueLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },

  baseValue: {
    marginTop: 4,
    fontSize: 25,
    fontWeight: '800',
    color: '#6B7280',
  },

  predictedValue: {
    marginTop: 4,
    fontSize: 25,
    fontWeight: '800',
    color: '#2563EB',
  },

  arrow: {
    fontSize: 23,
    color: '#9CA3AF',
    marginHorizontal: 8,
  },

  resultChange: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },


  // ==========================================================
  // INTERPRETATION
  // ==========================================================

  interpretationCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 15,
    padding: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  interpretationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E3A8A',
  },

  interpretationText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#374151',
  },


  // ==========================================================
  // MODEL STATUS
  // ==========================================================

  modelStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
  },

  modelStatusIcon: {
    fontSize: 23,
  },

  modelStatusText: {
    flex: 1,
    marginLeft: 10,
  },

  modelStatusTitle: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  modelStatusValue: {
    marginTop: 3,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  checkIcon: {
    color: '#34D399',
    fontSize: 21,
    fontWeight: '800',
  },


  // ==========================================================
  // RESET
  // ==========================================================

  resetButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },

  resetButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },


  // ==========================================================
  // FOOTER
  // ==========================================================

  footer: {
    marginTop: 18,
    paddingHorizontal: 8,
  },

  footerText: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 17,
    color: '#9CA3AF',
  },

});