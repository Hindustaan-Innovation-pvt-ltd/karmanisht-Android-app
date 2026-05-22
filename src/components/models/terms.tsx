import React from 'react';
import CustomPolicyModel from './policy-modal';

interface CustomTermsModelProps {
  visible: boolean;
  onClose: () => void;
  role?: 'consumer' | 'worker';
}

/**
 * @deprecated Use CustomPolicyModel from '@/components/models/policy-modal' instead.
 */
export default function CustomTermsModel({ visible, onClose, role = 'consumer' }: CustomTermsModelProps) {
  return (
    <CustomPolicyModel
      visible={visible}
      onClose={onClose}
      role={role}
      type="terms"
    />
  );
}