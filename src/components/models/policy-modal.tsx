import React from 'react';
import { Modal, ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import ScalePressable from '@/components/scale-pressable';

interface PolicySection {
  id: string;
  icon: string;
  title: string;
  content: string;
}

interface PolicyDocument {
  title: string;
  subtitle: string;
  sections: PolicySection[];
}

interface RolePolicies {
  privacy: PolicyDocument;
  terms: PolicyDocument;
}

interface PolicyContentMap {
  consumer: RolePolicies;
  worker: RolePolicies;
}

const POLICY_CONTENT: PolicyContentMap = {
  consumer: {
    privacy: {
      title: "Privacy Policy",
      subtitle: "For Consumer Accounts",
      sections: [
        {
          id: "1",
          icon: "user",
          title: "1. Data We Collect",
          content: "We collect personal details such as your name, mobile phone number, email address, and service search coordinates to successfully match you with nearby service providers."
        },
        {
          id: "2",
          icon: "share-2",
          title: "2. Shared Information",
          content: "Your active service request description, selected category, and approximate location coordinates are shared with matching workers within your search radius to facilitate bookings."
        },
        {
          id: "3",
          icon: "star",
          title: "3. Ratings & Reviews",
          content: "To foster a secure and trusted community, any feedback, reviews, or ratings you submit regarding service providers are public and visible to other users."
        },
        {
          id: "4",
          icon: "trash-2",
          title: "4. Data Control & Deletion",
          content: "You maintain full ownership of your data. You can permanently delete your consumer account via Settings, which sanitizes your profile, active requests, and unlock histories."
        }
      ]
    },
    terms: {
      title: "Terms of Service",
      subtitle: "For Consumer Accounts",
      sections: [
        {
          id: "1",
          icon: "globe",
          title: "1. Platform Service",
          content: "Hindustaan Innovations operates as an intermediary platform connecting consumers and independent service providers. We do not employ providers and are not liable for their conduct or services."
        },
        {
          id: "2",
          icon: "check-circle",
          title: "2. Account Eligibility",
          content: "You must be at least 18 years of age to register. You agree to provide accurate, current, and complete details, and avoid registering duplicate or fraudulent accounts."
        },
        {
          id: "3",
          icon: "dollar-sign",
          title: "3. Pricing & Direct Booking",
          content: "Service rates, final scope, and specific payment arrangements are negotiated directly between you and the service provider. The platform is not party to or responsible for payment disputes."
        },
        {
          id: "4",
          icon: "users",
          title: "4. Code of Conduct",
          content: "You agree to interact with service providers in a professional, courteous, and safe manner. Any physical threats, non-payment, or harassment will result in immediate termination."
        }
      ]
    }
  },
  worker: {
    privacy: {
      title: "Privacy Policy",
      subtitle: "For Service Partners",
      sections: [
        {
          id: "1",
          icon: "file-text",
          title: "1. Registration & KYC Data",
          content: "We collect registration details (name, phone, skills, certifications) and verification files (KYC uploads) to verify and activate your professional profile."
        },
        {
          id: "2",
          icon: "navigation",
          title: "2. Symmetrical Distance Tracking",
          content: "When online, we track your approximate location coordinates to perform spatial mutual-radius calculations and display your distance to nearby consumers."
        },
        {
          id: "3",
          icon: "shield",
          title: "3. Verification Document Security",
          content: "Identity verification documents are stored securely in encrypted directories. They are strictly utilized for safety audits and never shared with external parties."
        },
        {
          id: "4",
          icon: "trash-2",
          title: "4. Permanent Account Purge",
          content: "Upon deleting your worker account, your profile, active leads, ratings, review entries, specialties, and location snapshots are permanently wiped from our active databases."
        }
      ]
    },
    terms: {
      title: "Terms of Service",
      subtitle: "For Service Partners",
      sections: [
        {
          id: "1",
          icon: "award",
          title: "1. Service Commitments",
          content: "Workers must possess all necessary skills, tools, and certifications. Providing misleading qualifications or low-quality work is ground for immediate suspension."
        },
        {
          id: "2",
          icon: "activity",
          title: "2. Symmetrical Radius Compliance",
          content: "Symmetrical distance calculations require you to keep your availability status accurate. Going online implies you are ready and available to accept nearby matches."
        },
        {
          id: "3",
          icon: "key",
          title: "3. Lead Unlocking & Subscriptions",
          content: "Accessing customer phone numbers or details requires active tokens or premium passes. Lead unlock payments are non-refundable unless verified as a system error."
        },
        {
          id: "4",
          icon: "lock",
          title: "4. Customer Data Confidentiality",
          content: "You agree to use unlocked customer contact information strictly to coordinate and complete requested services. Direct marketing, spam, or harassment will result in a permanent ban."
        }
      ]
    }
  }
};

interface CustomPolicyModelProps {
  visible: boolean;
  onClose: () => void;
  role: 'consumer' | 'worker';
  type: 'privacy' | 'terms';
}

export default function CustomPolicyModel({ visible, onClose, role, type }: CustomPolicyModelProps) {
  const { colors, isDark } = useTheme();

  const doc = POLICY_CONTENT[role]?.[type] || {
    title: type === 'privacy' ? 'Privacy Policy' : 'Terms of Service',
    subtitle: role === 'worker' ? 'For Service Partners' : 'For Consumer Accounts',
    sections: []
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {doc.title}
            </Text>
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
              {doc.subtitle}
            </Text>
          </View>
          <ScalePressable
            onPress={onClose}
            hapticType="light"
            className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-800"
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </ScalePressable>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          className="flex-1 px-6 pt-6" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {doc.sections.map((section) => (
            <View 
              key={section.id}
              className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850 rounded-2xl p-5 mb-4 shadow-sm"
            >
              <View className="flex-row items-center mb-3">
                <View className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/20 items-center justify-center mr-3">
                  <Feather name={section.icon as any} size={16} color={isDark ? '#60a5fa' : '#3b82f6'} />
                </View>
                <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {section.title}
                </Text>
              </View>
              <Text className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-medium">
                {section.content}
              </Text>
            </View>
          ))}

          {/* Footer branding details */}
          <View className="items-center mt-6 pt-6 border-t border-slate-100 dark:border-slate-850">
            <Text className="text-[10px] font-black text-slate-350 dark:text-slate-700 tracking-widest uppercase mb-1">
              Hindustaan Innovations PVT. LTD.
            </Text>
            <Text className="text-[9px] font-semibold text-slate-450 dark:text-slate-600">
              Last Updated: May 2026
            </Text>
          </View>
        </ScrollView>

        {/* Bottom CTA Action Bar */}
        <View className="px-6 py-4 border-t border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-950">
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            className="w-full bg-slate-900 dark:bg-white py-4 rounded-xl items-center justify-center shadow-md dark:shadow-none"
          >
            <Text className="text-white dark:text-slate-900 font-bold text-base">
              Acknowledge & Close
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
