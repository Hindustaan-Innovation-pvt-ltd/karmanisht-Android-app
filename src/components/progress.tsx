// @ts-nocheck
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepperProps {
  steps?: Step[];
  currentStep: number;
  onStepPress?: (stepId: number) => void;
  totalSteps?: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onStepPress, totalSteps }) => {
  // If totalSteps is provided, render a simple linear progress bar
  if (totalSteps) {
    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.track}>
          <View 
            style={[
              styles.fill, 
              { width: `${(currentStep / totalSteps) * 100}%` }
            ]} 
          />
        </View>
      </View>
    );
  }

  // Fallback to Stepper view if steps are provided
  if (!steps) return null;

  return (
    <View style={styles.container}>
      {/* Step Indicators */}
      <View style={styles.indicatorsContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.stepWrapper}>
            <View style={[
              styles.indicatorCircle,
              { backgroundColor: index <= currentStep ? '#4CAF50' : '#ccc' }
            ]} />
            <View style={styles.connector} />
            <TouchableOpacity
              style={styles.stepItem}
              onPress={() => onStepPress?.(step.id)}
              disabled={index > currentStep}
            >
              <Text style={[
                styles.stepTitle,
                { color: index <= currentStep ? '#333' : '#666' }
              ]}>
                {step.title}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Step Details (Example) */}
      <View style={styles.detailsContainer}>
        <Text style={styles.detailsTitle}>Current Step: {steps.find(s => s.id === currentStep)?.title || 'N/A'}</Text>
        <Text style={styles.detailsDescription}>{steps.find(s => s.id === currentStep)?.description || 'Please select a step.'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: '100%',
  },
  track: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: 2,
  },
  indicatorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  stepWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 5,
  },
  indicatorCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ccc',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  connector: {
    flex: 1,
    height: 3,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  stepItem: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailsDescription: {
    fontSize: 14,
    color: '#555',
  },
});

export default Stepper;
