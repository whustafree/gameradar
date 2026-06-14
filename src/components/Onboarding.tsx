import { useState } from 'react';
import { OnboardingStep, Language } from '../types';
import { t } from '../i18n';

interface OnboardingProps {
  language: Language;
  step: OnboardingStep;
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS: { icon: string; titleKey: string; descKey: string }[] = [
  { icon: '🎮', titleKey: 'onboardingWelcome', descKey: 'onboardingWelcomeDesc' },
  { icon: '🖥️', titleKey: 'onboardingPlatform', descKey: 'onboardingPlatformDesc' },
  { icon: '👁️', titleKey: 'onboardingDetail', descKey: 'onboardingDetailDesc' },
  { icon: '❤️', titleKey: 'onboardingFavorite', descKey: 'onboardingFavoriteDesc' },
  { icon: '📋', titleKey: 'onboardingWishlist', descKey: 'onboardingWishlistDesc' },
  { icon: '🚀', titleKey: 'onboardingDone', descKey: 'onboardingDoneDesc' },
];

export default function Onboarding({ language, step, onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(() => {
    const idx = STEPS.findIndex(s => {
      const key = s.titleKey.replace('onboarding', '').toLowerCase();
      return step === key || (step === 'welcome' && key === 'welcome');
    });
    return idx >= 0 ? idx : 0;
  });

  const isLast = currentStep === STEPS.length - 1;
  const s = STEPS[currentStep];

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(p => p + 1);
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-icon">{s.icon}</div>
        <h2 className="onboarding-title">{t(s.titleKey as any, language)}</h2>
        <p className="onboarding-desc">{t(s.descKey as any, language)}</p>

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <button
              key={i}
              className={`onboarding-dot ${i === currentStep ? 'active' : ''}`}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>

        <button className="onboarding-btn primary" onClick={handleNext}>
          {isLast ? t('onboardingStart', language) : t('onboardingNext', language)}
        </button>
        {!isLast && (
          <button className="onboarding-btn secondary" onClick={onSkip}>
            {t('onboardingSkip', language)}
          </button>
        )}
      </div>
    </div>
  );
}
