import React from 'react';

// ============================================
// QuantitySelector 컴포넌트
// ============================================
// 역할: 주문 수량 조절 UI
// ============================================

interface QuantitySelectorProps {
  quantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  onDecrease,
  onIncrease,
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h3 className="font-bold text-gray-700 mb-4">주문 수량</h3>
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onDecrease}
          disabled={quantity <= 1}
          className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          -
        </button>
        <span className="text-3xl font-bold w-16 text-center">{quantity}</span>
        <button
          onClick={onIncrease}
          className="w-12 h-12 rounded-full bg-gray-200 hover:bg-gray-300 text-xl font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
};

