import React, { useState, useEffect } from 'react';
import apiClient from '../../lib/axios';
import {
  OrderResponseDto,
  OrderStatus,
  DeliveryStatus,
  ApproveOrderRequest,
  UpdateDeliveryStatusRequest,
} from '../../types/api';

// ============================================
// AdminOrderPage 컴포넌트
// ============================================
// 역할: 관리자 주문 관리 페이지
// API:
//   - GET /api/orders/admin/all - 모든 주문 조회
//   - GET /api/orders/admin/search - 주문 검색
//   - POST /api/orders/admin/{orderId}/approve - 주문 승인/거절
//   - PATCH /api/orders/admin/{orderId}/delivery-status - 배송 상태 변경
// ============================================

const getStatusBadgeColor = (status: OrderStatus | DeliveryStatus): string => {
  switch (status) {
    case 'PENDING_APPROVAL':
      return 'bg-yellow-100 text-yellow-800';
    case 'APPROVED':
      return 'bg-green-100 text-green-800';
    case 'REJECTED':
      return 'bg-red-100 text-red-800';
    case 'PLACED':
    case 'READY':
      return 'bg-blue-100 text-blue-800';
    case 'COOKING':
      return 'bg-orange-100 text-orange-800';
    case 'SHIPPING':
      return 'bg-purple-100 text-purple-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
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

export const AdminOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [searchUsername, setSearchUsername] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderResponseDto | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // 최신 주문 30개 조회 (백엔드에서 이미 정렬되어 반환됨)
      const response = await apiClient.get<OrderResponseDto[]>('/orders/admin/all');
      setOrders(response.data);
    } catch (err: any) {
      console.error('주문 목록 로딩 실패:', err);
      setError('주문 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    // 검색어가 없으면 기본 목록으로 복귀
    if (!searchOrderNumber.trim() && !searchUsername.trim()) {
      fetchOrders();
      setSearchOrderNumber('');
      setSearchUsername('');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const params: { orderNumber?: string; username?: string } = {};
      if (searchOrderNumber.trim()) {
        params.orderNumber = searchOrderNumber.trim();
      }
      if (searchUsername.trim()) {
        params.username = searchUsername.trim();
      }

      const response = await apiClient.get<OrderResponseDto[]>('/orders/admin/search', { params });
      setOrders(response.data);
    } catch (err: any) {
      console.error('주문 검색 실패:', err);
      setError('주문 검색에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    try {
      setIsProcessing(true);
      const request: ApproveOrderRequest = {
        approved: true,
      };
      await apiClient.post(`/orders/admin/${orderId}/approve`, request);
      alert('주문이 승인되었습니다.');
      setShowApprovalModal(false);
      setSelectedOrder(null);
      fetchOrders();
    } catch (err: any) {
      console.error('주문 승인 실패:', err);
      const errorMessage = err.response?.data?.message || '주문 승인에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }

    if (!selectedOrder) return;

    try {
      setIsProcessing(true);
      const request: ApproveOrderRequest = {
        approved: false,
        rejectionReason: rejectionReason,
      };
      await apiClient.post(`/orders/admin/${selectedOrder.id}/approve`, request);
      alert('주문이 거절되었습니다.');
      setShowRejectionModal(false);
      setSelectedOrder(null);
      setRejectionReason('');
      fetchOrders();
    } catch (err: any) {
      console.error('주문 거절 실패:', err);
      const errorMessage = err.response?.data?.message || '주문 거절에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, deliveryStatus: DeliveryStatus) => {
    try {
      setIsProcessing(true);
      const request: UpdateDeliveryStatusRequest = { deliveryStatus };
      await apiClient.patch(`/orders/admin/${orderId}/delivery-status`, request);
      alert('배송 상태가 변경되었습니다.');
      fetchOrders();
    } catch (err: any) {
      console.error('배송 상태 변경 실패:', err);
      
      // 401 에러 처리
      if (err.response?.status === 401) {
        alert(
          '인증이 만료되었습니다.\n' +
          '다시 로그인한 후 시도해주세요.'
        );
        // 로그아웃 처리
        localStorage.removeItem('accessToken');
        localStorage.removeItem('mr-daebak-auth');
        window.location.href = '/login';
        return;
      }
      
      const errorMessage = err.response?.data?.message || '배송 상태 변경에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">주문 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="text-green-600 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.orderStatus === 'PENDING_APPROVAL');
  const approvedOrders = orders.filter((o) => o.orderStatus === 'APPROVED');

  return (
    <div className="max-w-6xl mx-auto p-4 pt-10 pb-20">
      <h1 className="text-2xl font-bold mb-6">관리자 주문 관리</h1>

      {/* 검색 */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchOrderNumber}
              onChange={(e) => setSearchOrderNumber(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="주문 번호로 검색..."
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="사용자 아이디로 검색..."
              className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-all"
            >
              검색
            </button>
            {(searchOrderNumber.trim() || searchUsername.trim()) && (
              <button
                onClick={() => {
                  setSearchOrderNumber('');
                  setSearchUsername('');
                  fetchOrders();
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all"
              >
                초기화
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 승인 대기 주문 */}
      {pendingOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-yellow-600 mb-4">
            승인 대기 ({pendingOrders.length})
          </h2>
          <div className="space-y-4">
            {pendingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border-2 border-yellow-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      주문 번호: {order.orderNumber}
                    </h3>
                    <p className="text-sm text-gray-500">
                      주문일시: {formatDate(order.orderedAt)}
                    </p>
                    {order.username && (
                      <p className="text-sm text-gray-500">
                        사용자: {order.username}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      총 금액: ₩{order.grandTotal.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowApprovalModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowRejectionModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
                    >
                      거절
                    </button>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">주문 상품</h4>
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {item.productName} × {item.quantity}개
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 승인된 주문 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          승인된 주문 ({approvedOrders.length})
        </h2>
        <div className="space-y-4">
          {approvedOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    주문 번호: {order.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-500">
                    주문일시: {formatDate(order.orderedAt)}
                  </p>
                  {order.username && (
                    <p className="text-sm text-gray-500">
                      사용자: {order.username}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        order.orderStatus
                      )}`}
                    >
                      {order.orderStatus}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        order.deliveryStatus
                      )}`}
                    >
                      {order.deliveryStatus}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {order.deliveryStatus === 'READY' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(order.id, 'COOKING')}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-all disabled:opacity-50"
                    >
                      조리 시작
                    </button>
                  )}
                  {order.deliveryStatus === 'COOKING' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(order.id, 'SHIPPING')}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
                    >
                      배달 시작
                    </button>
                  )}
                  {order.deliveryStatus === 'SHIPPING' && (
                    <button
                      onClick={() => handleUpdateDeliveryStatus(order.id, 'DELIVERED')}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all disabled:opacity-50"
                    >
                      배달 완료
                    </button>
                  )}
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-700 mb-2">주문 상품</h4>
                <div className="space-y-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      {item.productName} × {item.quantity}개 - ₩{item.lineTotal.toLocaleString()}
                    </div>
                  ))}
                </div>
                <p className="text-right mt-4 font-bold text-lg">
                  총 금액: ₩{order.grandTotal.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 승인 모달 */}
      {showApprovalModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">주문 승인</h3>
            <p className="text-gray-600 mb-6">
              주문 번호 <strong>{selectedOrder.orderNumber}</strong>를 승인하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setSelectedOrder(null);
                }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-all"
              >
                취소
              </button>
              <button
                onClick={() => handleApprove(selectedOrder.id)}
                disabled={isProcessing}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '승인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 거절 모달 */}
      {showRejectionModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">주문 거절</h3>
            <p className="text-gray-600 mb-4">
              주문 번호 <strong>{selectedOrder.orderNumber}</strong>를 거절하시겠습니까?
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거절 사유를 입력해주세요..."
              className="w-full p-3 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setSelectedOrder(null);
                  setRejectionReason('');
                }}
                className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium hover:bg-gray-50 transition-all"
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {isProcessing ? '처리 중...' : '거절'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

