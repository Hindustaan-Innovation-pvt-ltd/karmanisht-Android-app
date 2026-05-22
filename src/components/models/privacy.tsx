import React from 'react';
import CustomPolicyModel from './policy-modal';

interface CustomPrivacyModelProps {
  visible: boolean;
  onClose: () => void;
  role?: 'consumer' | 'worker';
}

/**
 * @deprecated Use CustomPolicyModel from '@/components/models/policy-modal' instead.
 */
export default function CustomPrivacyModel({ visible, onClose, role = 'consumer' }: CustomPrivacyModelProps) {
  return (
    <CustomPolicyModel
      visible={visible}
      onClose={onClose}
      role={role}
      type="privacy"
    />
  );
}