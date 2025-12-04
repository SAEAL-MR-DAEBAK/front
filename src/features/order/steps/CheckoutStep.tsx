import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { UserCardResponseDto } from '../../../types/api';

// ============================================
// CheckoutStep 컴포넌트
// ============================================
// 역할: 5단계 - 주문 확인 및 결제 처리
// API:
//   - POST /api/products/createProduct - 상품 생성
//   - POST /api/carts/createCart - 장바구니 생성
//   - POST /api/carts/{cartId}/checkout - 결제 처리
// ============================================

export const CheckoutStep: React.FC = () => {
  const navigate = useNavigate();

  // ----------------------------------------
  // Store에서 상태 가져오기
  // ----------------------------------------
  const { logout } = useAuthStore();
  const {
    selectedAddress,
    selectedDinner,
    selectedStyle,
    createdProduct,
    quantity,
    memo,
    menuCustomizations,
    additionalMenuItems,
    resetOrder,
    prevStep,
  } = useOrderFlowStore();
  
  // 단순한 가격 계산: 프론트엔드에서 직접 계산
  const calculateTotalPrice = () => {
    if (!selectedDinner || !selectedStyle) return 0;
    
    // 1. 디너 가격 + 스타일 가격
    const basePrice = (selectedDinner.basePrice + selectedStyle.extraPrice) * quantity;
    
    // 2. 메뉴 구성 변경 추가 비용 (기본 수량보다 많이 선택한 경우만)
    const menuCustomizationPrice = menuCustomizations.reduce((sum, item) => {
      if (item.currentQuantity > item.defaultQuantity) {
        const productMenuItem = createdProduct?.productMenuItems?.find(
          (pmi) => pmi.menuItemId === item.menuItemId
        );
        if (productMenuItem) {
          const quantityDiff = item.currentQuantity - item.defaultQuantity;
          // unitPrice는 productMenuItem에 있음
          const additionalCost = (productMenuItem.unitPrice || 0) * quantityDiff * quantity;
          return sum + additionalCost;
        }
      }
      return sum;
    }, 0);
    
    // 3. 추가 메뉴 가격
    const additionalMenuPrice = additionalMenuItems.reduce((sum, item) => {
      const productMenuItem = createdProduct?.productMenuItems?.find(
        (pmi) => pmi.menuItemId === item.menuItemId
      );
      if (productMenuItem && item.quantity > 0) {
        return sum + (productMenuItem.unitPrice || 0) * item.quantity * quantity;
      }
      return sum;
    }, 0);
    
    return basePrice + menuCustomizationPrice + additionalMenuPrice;
  };
  
  const totalPrice = calculateTotalPrice();

  // ----------------------------------------
  // 로컬 상태
  // ----------------------------------------
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<UserCardResponseDto[]>([]);

  // ----------------------------------------
  // 결제 수단 조회
  // ----------------------------------------
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await apiClient.get<UserCardResponseDto[]>('/users/cards');
        setPaymentMethods(response.data);
      } catch (err) {
        console.error('결제 수단 조회 실패:', err);
        // 에러가 발생해도 계속 진행 (결제 수단이 없을 수 있음)
      }
    };

    fetchPaymentMethods();
  }, []);

  // ----------------------------------------
  // 결제 처리 핸들러
  // ----------------------------------------
  const handleCheckout = async () => {
    if (!createdProduct) {
      alert('상품 정보가 없습니다. 이전 단계로 돌아가주세요.');
      return;
    }

    // 결제 수단 확인
    if (paymentMethods.length === 0) {
      const confirmed = window.confirm(
        '등록된 결제 수단이 없습니다.\n마이페이지에서 결제 수단을 추가하시겠습니까?'
      );
      if (confirmed) {
        navigate('/mypage');
      }
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Cart 생성 (이미 생성된 product 사용)
      const cartResponse = await apiClient.post('/carts/createCart', {
        items: [{ productId: createdProduct.id, quantity: quantity }],
        deliveryAddress: selectedAddress,
        deliveryMethod: 'Delivery',
        memo,
      });

      // Step 2: Checkout
      const orderResponse = await apiClient.post(`/carts/${cartResponse.data.id}/checkout`);

      // Step 3: 성공 처리 (API에서 가져온 주문 정보 사용)
      const order = orderResponse.data;
      alert(
        `주문이 완료되었습니다!\n\n` +
          `주문 번호: ${order.orderNumber}\n` +
          `주문 내용: ${selectedDinner?.dinnerName} (${selectedStyle?.styleName})\n` +
          `수량: ${quantity}개\n` +
          `총 금액: ₩${order.grandTotal.toLocaleString()}\n` +
          `배달 주소: ${selectedAddress}`
      );

      // Step 4: 초기화 및 메인으로 이동
      resetOrder();
      navigate('/');
    } catch (err: any) {
      console.error('결제 실패:', err);
      
      // 401 에러 (인증 실패) 처리
      if (err.response?.status === 401) {
        // 인증 정보 제거
        localStorage.removeItem('accessToken');
        localStorage.removeItem('mr-daebak-auth');
        logout();
        
        alert(
          '인증이 만료되었습니다.\n' +
          '다시 로그인한 후 결제를 진행해주세요.'
        );
        
        // 로그인 페이지로 이동
        navigate('/login', { replace: true });
        return;
      }
      
      // 403 에러 (권한 없음) 처리
      if (err.response?.status === 403) {
        alert('결제 권한이 없습니다. 관리자에게 문의해주세요.');
        return;
      }
      
      // 기타 에러 처리
      const errorMessage = err.response?.data?.message || err.message || '알 수 없는 오류';
      alert(`결제 처리에 실패했습니다.\n\n오류: ${errorMessage}\n\n다시 시도해주세요.`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ----------------------------------------
  // 렌더링
  // ----------------------------------------
  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          주문 <span className="text-green-600">확인</span>
        </h2>
        <p className="text-gray-500">주문 내용을 확인해주세요</p>
      </div>

      {/* 주문 요약 카드 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 space-y-6">
        {/* ---------------------------------------- */}
        {/* 배달 주소 */}
        {/* ---------------------------------------- */}
        <div className="flex items-start gap-4">
          <span className="text-2xl">📍</span>
          <div>
            <p className="text-sm text-gray-500">배달 주소</p>
            <p className="font-bold">{selectedAddress}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ---------------------------------------- */}
        {/* 디너 정보 */}
        {/* ---------------------------------------- */}
        <div className="flex items-start gap-4">
          <span className="text-2xl">🍽️</span>
          <div className="flex-1">
            <p className="text-sm text-gray-500">주문 메뉴</p>
            <p className="font-bold">{selectedDinner?.dinnerName}</p>
            <p className="text-sm text-gray-500">{selectedStyle?.styleName} 스타일</p>
            <p className="text-sm text-gray-500">수량: {quantity}개</p>
          </div>
        </div>

        {/* ---------------------------------------- */}
        {/* 메뉴 구성 변경 정보 */}
        {/* ---------------------------------------- */}
        {createdProduct && createdProduct.productMenuItems && createdProduct.productMenuItems.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <div className="flex items-start gap-4">
              <span className="text-2xl">📋</span>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">메뉴 구성</p>
                <div className="space-y-1">
                  {createdProduct.productMenuItems.map((item, index) => {
                    const customization = menuCustomizations.find(
                      (c) => c.menuItemId === item.menuItemId
                    );
                    const isModified = customization && customization.currentQuantity !== customization.defaultQuantity;
                    
                    return (
                      <div key={index} className="text-sm">
                        <span className={isModified ? 'font-medium text-green-600' : 'text-gray-700'}>
                          {item.menuItemName}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {item.quantity}개
                          {isModified && (
                            <span className="text-green-600 ml-1">
                              (기본: {customization?.defaultQuantity}개 → {customization?.currentQuantity}개)
                            </span>
                          )}
                        </span>
                        <span className="text-gray-400 ml-2">
                          ₩{item.lineTotal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------------------------------- */}
        {/* 추가 메뉴 정보 */}
        {/* ---------------------------------------- */}
        {additionalMenuItems.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <div className="flex items-start gap-4">
              <span className="text-2xl">➕</span>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">추가 메뉴</p>
                <div className="space-y-1">
                  {additionalMenuItems.map((item) => {
                    const productMenuItem = createdProduct?.productMenuItems.find(
                      (pmi) => pmi.menuItemId === item.menuItemId
                    );
                    return (
                      <div key={item.menuItemId} className="text-sm">
                        <span className="font-medium text-green-600">
                          {item.menuItemName}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {item.quantity}개
                        </span>
                        {productMenuItem && (
                          <span className="text-gray-400 ml-2">
                            ₩{productMenuItem.lineTotal.toLocaleString()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ---------------------------------------- */}
        {/* 요청사항 (있는 경우만) */}
        {/* ---------------------------------------- */}
        {memo && (
          <>
            <hr className="border-gray-100" />
            <div className="flex items-start gap-4">
              <span className="text-2xl">📝</span>
              <div>
                <p className="text-sm text-gray-500">요청사항</p>
                <p className="font-medium">{memo}</p>
              </div>
            </div>
          </>
        )}

        <hr className="border-gray-100" />

        {/* ---------------------------------------- */}
        {/* 결제 금액 (API에서 가져온 가격 사용) */}
        {/* ---------------------------------------- */}
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">총 결제 금액</p>
          <p className="text-2xl font-bold text-green-600">
            ₩{totalPrice.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 버튼 영역 */}
      <div className="flex gap-4">
        <button
          onClick={prevStep}
          disabled={isProcessing}
          className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <button
          onClick={handleCheckout}
          disabled={isProcessing}
          className="flex-1 py-4 rounded-xl text-lg font-bold bg-green-600 text-white hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? '처리 중...' : `₩${totalPrice.toLocaleString()} 결제하기`}
        </button>
      </div>
    </div>
  );
};
