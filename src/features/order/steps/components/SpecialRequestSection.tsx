import React from 'react';

// ============================================
// SpecialRequestSection 컴포넌트
// ============================================
// 역할: 특별 요청사항 입력 UI
// ============================================

interface SpecialRequestSectionProps {
  memo: string;
  onMemoChange: (memo: string) => void;
}

export const SpecialRequestSection: React.FC<SpecialRequestSectionProps> = ({
  memo,
  onMemoChange,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <h3 className="font-bold text-gray-700 mb-4">특별 요청사항</h3>
      <textarea
        value={memo}
        onChange={(e) => onMemoChange(e.target.value)}
        placeholder="예: 샴페인을 2병으로 변경해주세요, 커피는 빼주세요"
        className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        rows={3}
      />
    </div>
  );
};

