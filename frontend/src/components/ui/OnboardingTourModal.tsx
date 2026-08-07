'use client';

import React, { useState } from 'react';
import api from '@/lib/api';
import {
  ShieldCheck, CheckCircle2, Layers, Cpu, Compass, ArrowRight, ArrowLeft, X, Sparkles
} from 'lucide-react';

interface OnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    icon: Sparkles,
    title: 'Welcome to TrustArmor GRC',
    subtitle: 'Automated Compliance & Risk Management Platform',
    content: 'TrustArmor automates your compliance workflows, continuous evidence collection, vendor risk assessments, and multi-framework audit readiness in one centralized platform.',
  },
  {
    icon: CheckCircle2,
    title: 'What is a "Control"?',
    subtitle: 'Safeguards that protect your business',
    content: 'A Control is a specific technical configuration or operational policy (e.g. Enforcing Multi-Factor Authentication or Daily Database Backups) implemented to prevent security incidents and fulfill compliance clauses.',
  },
  {
    icon: Layers,
    title: 'Understanding "Framework Coverage"',
    subtitle: 'Mapping controls to compliance standards',
    content: 'Framework Coverage measures what percentage of mandatory clauses (SOC 2, ISO 27001, HIPAA, PCI DSS, GDPR, DORA) are satisfied by active controls in your workspace.',
  },
  {
    icon: Cpu,
    title: 'Automated vs. Manual Evidence',
    subtitle: 'Continuous audit readiness',
    content: 'Automated evidence is gathered automatically via cloud integrations (AWS, GitHub, Google Cloud). Manual evidence allows security managers to upload policy sign-offs, vendor SOC reports, or physical security logs.',
  },
  {
    icon: Compass,
    title: 'Navigating Your Workspace',
    subtitle: 'Frameworks, Controls, and Product Compliance',
    content: 'Use the left sidebar to navigate between Frameworks (manage certifications), Controls (view safeguards), Product Compliance (track posture per ERP product), and Vendors (TPRM risk ratings).',
  },
];

export function OnboardingTourModal({ isOpen, onClose }: OnboardingTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  const handleFinish = async () => {
    try {
      await api.patch('/users/me/onboarding', { has_seen_onboarding: true });
    } catch (err) {
      console.error('Failed to update onboarding status:', err);
    } finally {
      onClose();
    }
  };

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-8 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {step.title}
              </h3>
            </div>
          </div>
          <button
            onClick={handleFinish}
            className="p-1 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700 dark:text-gray-300">
            {step.subtitle}
          </h4>
          <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed bg-slate-50 dark:bg-gray-950/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
            {step.content}
          </p>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-1.5 pt-2">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-8 bg-indigo-600 dark:bg-indigo-500'
                  : 'w-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Footer buttons */}
        <div className="flex justify-between items-center border-t border-slate-100 dark:border-white/5 pt-4">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-gray-950 hover:bg-slate-200 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300 font-semibold text-xs rounded-xl transition disabled:opacity-30"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleFinish}
              className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg"
            >
              <span>{isLastStep ? 'Complete Tour' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTourModal;
