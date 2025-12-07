import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { OrderResponseDto, OrderStatus, PaymentStatus, DeliveryStatus } from '../../../types/api';
import { useAuthStore } from '../../../stores/useAuthStore';

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
  const { isAuthenticated, validateToken } = useAuthStore();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 토큰 확인 및 검증
        const token = localStorage.getItem('accessToken');
        if (token && !isAuthenticated) {
          const isValid = await validateToken();
          if (!isValid) {
            setError('인증이 필요합니다. 다시 로그인해주세요.');
            setIsLoading(false);
            return;
          }
        } else if (!token) {
          setError('인증이 필요합니다. 다시 로그인해주세요.');
          setIsLoading(false);
          return;
        }
        
        const response = await apiClient.get<OrderResponseDto[]>('/orders');
        
        // 최신 주문이 먼저 오도록 정렬
        const sortedOrders = (response.data || []).sort((a, b) => 
          new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
        );
        setOrders(sortedOrders);
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError('인증이 필요합니다. 다시 로그인해주세요.');
        } else {
          setError(`주문 내역을 불러오는데 실패했습니다. ${err.response?.data?.message || err.message || ''}`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [isAuthenticated, validateToken]);

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
              <div className="space-y-3">
                {/* 디너 상품 */}
                {order.items
                  .filter(item => !item.productType || item.productType === 'DINNER_PRODUCT')
                  .map((item, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.productName}</p>
                          {item.optionSummary && (
                            <p className="text-xs text-gray-500 mt-1">{item.optionSummary}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-green-600">
                            ₩{item.lineTotal.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.quantity}개 × ₩{item.unitPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {/* Product의 메뉴 아이템 상세 표시 */}
                      {item.menuItems && item.menuItems.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 mb-1">구성 메뉴:</p>
                          <div className="space-y-1">
                            {item.menuItems.map((menuItem, menuIndex) => (
                              <div key={menuIndex} className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">
                                  • {menuItem.menuItemName} {menuItem.quantity}개
                                </span>
                                <span className="text-gray-500">
                                  ₩{menuItem.lineTotal.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                {/* 추가 메뉴 */}
                {order.items.filter(item => item.productType === 'ADDITIONAL_MENU_PRODUCT').length > 0 && (
                  <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">추가 메뉴</h4>
                    <div className="space-y-2">
                      {order.items
                        .filter(item => item.productType === 'ADDITIONAL_MENU_PRODUCT')
                        .map((item, index) => (
                          <div
                            key={index}
                            className="bg-blue-50 rounded-lg p-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">
                                  {item.productName.replace('추가 메뉴: ', '')}
                                </p>
                              </div>
                              <div className="text-right ml-4">
                                <p className="text-sm font-bold text-blue-600">
                                  ₩{item.lineTotal.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {item.quantity}개 × ₩{item.unitPrice.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
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
                {order.requestedDeliveryTime && (
                  <p className="text-green-600 font-medium">
                    ⏰ 희망 배달 시간: {formatDate(order.requestedDeliveryTime)}
                  </p>
                )}
                {order.occasionType && (
                  <p className="text-purple-600 font-medium">
                    🎉 기념일: {order.occasionType}
                  </p>
                )}
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

