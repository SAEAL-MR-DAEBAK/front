import React from 'react';
import { OrderItem } from '../types';

interface OrderSummaryProps {
  orderItems: OrderItem[];
  totalPrice: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  orderItems,
  totalPrice,
}) => {
  return (
    <div className="bg-gray-100 border-b px-4 py-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">🛒 임시장바구니</h3>
      <div className="space-y-2">
        {orderItems.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded">
            <div className="flex-1">
              <span>
                {item.dinnerName}
                {item.servingStyleName ? ` (${item.servingStyleName})` : ' (스타일 미선택)'}
                {' x '}{item.quantity}
              </span>
            </div>
            <span className="text-gray-600 ml-2">
              {item.totalPrice.toLocaleString()}원
            </span>
          </div>
        ))}
      </div>

      {/* 총액 표시 */}
      <div className="flex justify-between mt-2 pt-2 border-t border-gray-300 font-semibold">
        <span>총액</span>
        <span className="text-blue-600">
          {totalPrice.toLocaleString()}원
        </span>
      </div>

      <p className="text-xs text-gray-500 mt-2">
        "장바구니에 담아줘"라고 말씀하시면 주문이 등록됩니다.
      </p>
    </div>
  );
};

export default OrderSummary;
