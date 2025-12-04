import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { OrderResponseDto, OrderStatus, PaymentStatus, DeliveryStatus } from '../../../types/api';

// ============================================
// OrderHistoryPage 컴포넌트
// ============================================
// 역할: 사용자의 주문 내역을 조회하고 표시
// API: GET /api/orders
// ============================================

const getStatusBadgeColor = (status: OrderStatus | PaymentStatus | DeliveryStatus): string => {
  switch (status) {
    case 'PLACED':
    case 'PENDING_APPROVAL':
    case 'PENDING':
    case 'READY':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
    case 'PAID':
    case 'SUCCEEDED':
    case 'SHIPPING':
    case 'PICKUP_READY':
      return 'bg-blue-100 text-blue-800';
    case 'COOKING':
      return 'bg-orange-100 text-orange-800';
    case 'DELIVERED':
    case 'PICKED_UP':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
    case 'CANCELLED':
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUNDED':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: OrderStatus | PaymentStatus | DeliveryStatus): string => {
  const labels: Record<string, string> = {
    PLACED: '주문 생성',
    PENDING_APPROVAL: '승인 대기',
    APPROVED: '승인 완료',
    REJECTED: '거절됨',
    PAID: '결제 완료',
    CANCELLED: '취소됨',
    REFUNDED: '환불 완료',
    PENDING: '결제 대기',
    SUCCEEDED: '결제 완료',
    FAILED: '결제 실패',
    READY: '준비 중',
    COOKING: '조리 중',
    SHIPPING: '배달 중',
    DELIVERED: '배달 완료',
    PICKUP_READY: '픽업 준비 완료',
    PICKED_UP: '픽업 완료',
  };
  return labels[status] || status;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const OrderHistoryPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<OrderResponseDto[]>('/orders');
        // 최신 주문이 먼저 오도록 정렬
        const sortedOrders = response.data.sort((a, b) => 
          new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
        );
        setOrders(sortedOrders);
      } catch (err: any) {
        console.error('주문 내역 로딩 실패:', err);
        setError('주문 내역을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">주문 내역을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-green-600 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4 pt-10 pb-20">
        <h1 className="text-2xl font-bold mb-6">주문 내역</h1>
        <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
          <p className="text-gray-500 text-lg">주문 내역이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pt-10 pb-20">
      <h1 className="text-2xl font-bold mb-6">주문 내역</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
          >
            {/* 주문 헤더 */}
            <div className="flex items-start justify-between mb-4 pb-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  주문 번호: {order.orderNumber}
                </h2>
                <p className="text-sm text-gray-500">
                  주문일시: {formatDate(order.orderedAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.orderStatus)}`}>
                  {getStatusLabel(order.orderStatus)}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.paymentStatus)}`}>
                  {getStatusLabel(order.paymentStatus)}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.deliveryStatus)}`}>
                  {getStatusLabel(order.deliveryStatus)}
                </span>
              </div>
            </div>

            {/* 주문 아이템 */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">주문 상품</h3>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      {item.optionSummary && (
                        <p className="text-xs text-gray-500 mt-1">{item.optionSummary}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        수량: {item.quantity}개 × ₩{item.unitPrice.toLocaleString()} = ₩{item.lineTotal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 거절 사유 표시 */}
            {order.rejectionReason && (
              <div className="mb-4 pb-4 border-b">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-red-700 mb-2">거절 사유</h3>
                  <p className="text-sm text-red-600">{order.rejectionReason}</p>
                </div>
              </div>
            )}

            {/* 배송 정보 */}
            <div className="mb-4 pb-4 border-b">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">배송 정보</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>배송 방법: {order.deliveryMethod === 'Delivery' ? '배달' : '픽업'}</p>
                <p>배송 주소: {order.deliveryAddress}</p>
                {order.deliveryMemo && <p>배송 메모: {order.deliveryMemo}</p>}
                {order.memo && <p>주문 메모: {order.memo}</p>}
              </div>
            </div>

            {/* 가격 정보 */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600 space-y-1">
                <p>상품 금액: ₩{order.subtotal.toLocaleString()}</p>
                {order.discountAmount > 0 && (
                  <p className="text-green-600">할인 금액: -₩{order.discountAmount.toLocaleString()}</p>
                )}
                {order.deliveryFee > 0 && (
                  <p>배송비: ₩{order.deliveryFee.toLocaleString()}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 mb-1">총 결제 금액</p>
                <p className="text-2xl font-bold text-green-600">
                  ₩{order.grandTotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

