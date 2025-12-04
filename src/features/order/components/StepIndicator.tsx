import React from 'react';
import { OrderStep } from '../../../stores/useOrderFlowStore';

// ============================================
// StepIndicator 컴포넌트
// ============================================
// 역할: 주문 플로우의 현재 단계를 시각적으로 표시
// ============================================

interface StepIndicatorProps {
  currentStep: OrderStep;
}

// 단계 정의 (intro 제외 - intro는 인디케이터에 표시하지 않음)
// 순서: 주소 → 디너 → 서빙스타일 → 주문옵션 → 결제
const STEPS: { key: OrderStep; label: string }[] = [
  { key: 'address', label: '배달주소' },
  { key: 'dinner', label: '디너선택' },
  { key: 'style', label: '서빙스타일' },
  { key: 'customize', label: '주문옵션' },
  { key: 'checkout', label: '결제' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  // intro 단계에서는 인디케이터를 표시하지 않음
  if (currentStep === 'intro') {
    return null;
  }

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <React.Fragment key={step.key}>
          {/* 단계 원 */}
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                index <= currentIndex
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`mt-2 text-xs hidden sm:block ${
                index <= currentIndex ? 'text-green-600 font-medium' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>

          {/* 연결선 */}
          {index < STEPS.length - 1 && (
            <div
              className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 ${
                index < currentIndex ? 'bg-green-600' : 'bg-gray-200'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
