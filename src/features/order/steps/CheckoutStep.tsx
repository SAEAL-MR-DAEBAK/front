import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { UserCardResponseDto, MenuItemResponseDto } from '../../../types/api';

// ============================================
// CheckoutStep 컴포넌트
// ============================================
// 역할: 5단계 - 주문 확인 및 결제 처리 (여러 Product 지원)
// API:
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
    selectedDinners,
    globalAdditionalMenuItems,
    globalMemo,
    requestedDeliveryTime,
    setRequestedDeliveryTime,
    resetOrder,
    prevStep,
  } = useOrderFlowStore();

  // ----------------------------------------
  // 로컬 상태
  // ----------------------------------------
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<UserCardResponseDto[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItemResponseDto[]>([]);

  // ----------------------------------------
  // 모든 메뉴 아이템 로드 (가격 계산용)
  // ----------------------------------------
  useEffect(() => {
    const fetchAllMenuItems = async () => {
      try {
        const response = await apiClient.get<MenuItemResponseDto[]>(
          '/menu-items/getAllMenuItems'
        );
        setAllMenuItems(response.data);
      } catch (err) {
        console.error('전체 메뉴 아이템 로딩 실패:', err);
      }
    };

    fetchAllMenuItems();
  }, []);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const response = await apiClient.get<UserCardResponseDto[]>('/users/cards');
        setPaymentMethods(response.data);
      } catch (err) {
        console.error('결제 수단 조회 실패:', err);
      }
    };

    fetchPaymentMethods();
  }, []);

  // ★ Store의 menuCustomizations 기반으로 가격 계산 (CustomizeStep과 동일)
  const calculateProductPrice = useCallback((
    dinnerItem: typeof selectedDinners[0],
    instanceIndex: number
  ): number => {
    const instance = dinnerItem.instances[instanceIndex];
    if (!instance.product || !instance.style) return 0;

    // 기본 가격 (dinner + style)
    const basePrice = dinnerItem.dinner.basePrice + instance.style.extraPrice;

    // 메뉴 아이템 가격 계산 (커스터마이징 차이 반영)
    let menuItemsTotal = 0;
    instance.menuCustomizations.forEach(customization => {
      const menuItem = allMenuItems.find(m => m.id === customization.menuItemId);
      if (menuItem) {
        const quantityDiff = customization.currentQuantity - customization.defaultQuantity;
        menuItemsTotal += menuItem.unitPrice * quantityDiff;
      }
    });

    return basePrice + menuItemsTotal;
  }, [allMenuItems]);

  // ----------------------------------------
  // 총 가격 계산
  // ★ Store의 menuCustomizations 기반 (CustomizeStep과 동일)
  // ----------------------------------------
  const calculateTotalPrice = useCallback((): number => {
    let total = 0;

    // 각 Product 가격 합산 (커스터마이징 반영)
    selectedDinners.forEach(item => {
      item.instances.forEach((instance, instanceIndex) => {
        if (instance.product && instance.style) {
          total += calculateProductPrice(item, instanceIndex);
        }
      });
    });

    // 공통 추가 메뉴 가격 추가
    globalAdditionalMenuItems.forEach(additionalItem => {
      const menuItem = allMenuItems.find(m => m.id === additionalItem.menuItemId);
      if (menuItem) {
        total += menuItem.unitPrice * additionalItem.quantity;
      }
    });

    return total;
  }, [selectedDinners, globalAdditionalMenuItems, allMenuItems, calculateProductPrice]);

  const totalPrice = calculateTotalPrice();

  // ----------------------------------------
  // 결제 처리 핸들러
  // ----------------------------------------
  const handleCheckout = async () => {
    // 모든 Product가 생성되었는지 확인
    const allProductsCreated = selectedDinners.every(item =>
      item.instances.every(instance => instance.product)
    );

    if (!allProductsCreated) {
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
      // ★ Step 0: 커스터마이징을 백엔드에 반영 (결제 전)
      for (const dinnerItem of selectedDinners) {
        for (const instance of dinnerItem.instances) {
          if (!instance.product) continue;

          // 메뉴 커스터마이징 반영
          for (const customization of instance.menuCustomizations) {
            if (customization.currentQuantity !== customization.defaultQuantity) {
              try {
                await apiClient.patch(
                  `/products/${instance.product.id}/menu-items/${customization.menuItemId}`,
                  { quantity: Math.max(0, customization.currentQuantity) }
                );
              } catch {
                // 메뉴 아이템 업데이트 실패 시 무시하고 계속 진행
              }
            }
          }

          // 특별 요청사항을 Product의 memo에 저장
          if (globalMemo) {
            try {
              await apiClient.patch(`/products/${instance.product.id}/memo`, { memo: globalMemo });
            } catch {
              // 메모 업데이트 실패 시 무시하고 계속 진행
            }
          }
        }
      }

      // 모든 디너 Product를 Cart에 담기
      // ★ unitPrice 포함: 프론트엔드에서 계산한 가격을 백엔드에 전달
      const cartItems = selectedDinners.flatMap((item, dinnerIndex) =>
        item.instances
          .filter(instance => instance.product)
          .map((instance, instanceIndex) => ({
            productId: instance.product!.id,
            quantity: 1,  // 각 인스턴스는 quantity=1
            unitPrice: calculateProductPrice(item, instanceIndex)  // ★ 프론트엔드 계산 가격
          }))
      );

      // 공통 추가 메뉴를 별도 Product로 생성
      // ★ 각 추가 메뉴는 quantity=1인 Product로 생성하고, 원하는 수량만큼 Cart에 추가
      const additionalMenuCartItems: { productId: string; quantity: number; unitPrice: number }[] = [];
      if (globalAdditionalMenuItems.length > 0) {
        for (const additionalItem of globalAdditionalMenuItems) {
          try {
            // ★ Product는 항상 quantity=1로 생성 (단가 기준)
            const additionalProductResponse = await apiClient.post<ProductResponseDto>(
              '/products/createAdditionalMenuProduct',
              {
                menuItemId: additionalItem.menuItemId,
                quantity: 1,  // ★ Product는 1개 단위로 생성
                memo: globalMemo || undefined,
                address: selectedAddress
              }
            );
            // ★ Cart에는 사용자가 원하는 수량으로 추가
            // ★ unitPrice는 메뉴 아이템의 단가 (allMenuItems에서 조회)
            const menuItem = allMenuItems.find(m => m.id === additionalItem.menuItemId);
            additionalMenuCartItems.push({
              productId: additionalProductResponse.data.id,
              quantity: additionalItem.quantity,  // ★ 사용자가 선택한 수량
              unitPrice: menuItem?.unitPrice ?? 0  // ★ 메뉴 아이템 단가
            });
          } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || '알 수 없는 오류';
            alert(`추가 메뉴 "${additionalItem.menuItemName}" 생성에 실패했습니다.\n\n오류: ${errorMessage}`);
            setIsProcessing(false);
            return;
          }
        }
      }

      // 추가 메뉴 Product도 Cart에 추가 (사용자가 선택한 수량 반영)
      const allCartItems = [
        ...cartItems,
        ...additionalMenuCartItems
      ];

      if (allCartItems.length === 0) {
        alert('주문할 상품이 없습니다.');
        setIsProcessing(false);
        return;
      }

      // Step 1: Cart 생성 (디너 Product + 추가 메뉴 Product 모두 포함)
      const cartResponse = await apiClient.post('/carts/createCart', {
        items: allCartItems,
        deliveryAddress: selectedAddress,
        deliveryMethod: 'Delivery',
        memo: globalMemo || undefined,
        requestedDeliveryTime: requestedDeliveryTime || undefined,
      });

      // Step 2: Checkout
      const orderResponse = await apiClient.post(`/carts/${cartResponse.data.id}/checkout`);

      // Step 3: 성공 처리
      // 백엔드에서 계산된 실제 가격 사용 (공통 추가 메뉴가 Product에 포함된 후의 가격)
      const order = orderResponse.data;
      
      // 주문 요약 생성 (각 Product별로)
      const orderSummaryParts: string[] = [];
      selectedDinners.forEach(item => {
        item.instances.forEach((instance, instanceIndex) => {
          if (instance.product) {
            orderSummaryParts.push(`${item.dinner.dinnerName} ${instanceIndex + 1}번째 (${instance.style.styleName})`);
          }
        });
      });
      const orderSummary = orderSummaryParts.join(', ');

      // 백엔드에서 계산된 최종 가격 사용 (Cart 생성 시점의 Product 가격 반영)
      const finalPrice = Number(order.grandTotal);

      alert(
        `주문이 완료되었습니다!\n\n` +
          `주문 번호: ${order.orderNumber}\n` +
          `주문 내용: ${orderSummary}\n` +
          `총 금액: ₩${finalPrice.toLocaleString()}\n` +
          `배달 주소: ${selectedAddress}`
      );

      // Step 4: 초기화 및 주문 내역으로 이동
      resetOrder();
      navigate('/orders', { replace: true });
    } catch (err: any) {
      // 401 에러 (인증 실패) 처리
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('mr-daebak-auth');
        logout();

        alert(
          '인증이 만료되었습니다.\n' +
          '다시 로그인한 후 결제를 진행해주세요.'
        );

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
        {/* 배달 주소 */}
        <div className="flex items-start gap-4">
          <span className="text-2xl">📍</span>
          <div>
            <p className="text-sm text-gray-500">배달 주소</p>
            <p className="font-bold">{selectedAddress}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 배달 희망 시간 */}
        <div className="flex items-start gap-4">
          <span className="text-2xl">⏰</span>
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-2">배달 희망 시간</p>
            <input
              type="datetime-local"
              value={requestedDeliveryTime}
              onChange={(e) => setRequestedDeliveryTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              희망하시는 배달 시간을 선택해주세요 (선택사항)
            </p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 각 디너별 주문 정보 */}
        {selectedDinners.map((dinnerItem) => (
          <div key={dinnerItem.id}>
            <div className="flex items-start gap-4 mb-4">
              <span className="text-2xl">🍽️</span>
              <div className="flex-1">
                <p className="text-sm text-gray-500">주문 메뉴</p>
                <p className="font-bold">{dinnerItem.dinner.dinnerName}</p>
                <p className="text-sm text-gray-500">수량: {dinnerItem.quantity}개</p>
              </div>
            </div>

            {/* 각 인스턴스별 상세 정보 */}
            <div className="ml-12 space-y-3">
              {dinnerItem.instances.map((instance, index) => {
                if (!instance.product) return null;

                // 각 인스턴스의 가격 계산
                const instancePrice = calculateProductPrice(dinnerItem, index);

                return (
                  <div key={instance.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-gray-700">
                            {index + 1}번째 - {instance.style.styleName}
                          </p>
                          <p className="text-sm font-bold text-green-600">
                            ₩{instancePrice.toLocaleString()}
                          </p>
                        </div>
                        {/* ★ Store의 menuCustomizations 사용 (커스터마이징 반영) */}
                        {instance.menuCustomizations && instance.menuCustomizations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {instance.menuCustomizations.map((customization, idx) => (
                              <div key={idx} className="text-xs text-gray-600">
                                • {customization.menuItemName} {customization.currentQuantity}개
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* 공통 추가 메뉴 */}
        {globalAdditionalMenuItems.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <div className="flex items-start gap-4">
              <span className="text-2xl">➕</span>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">공통 추가 메뉴</p>
                <div className="space-y-1">
                  {globalAdditionalMenuItems.map((item) => {
                    const menuItem = allMenuItems.find(m => m.id === item.menuItemId);
                    const itemTotal = menuItem ? menuItem.unitPrice * item.quantity : 0;
                    
                    return (
                      <div key={item.menuItemId} className="flex justify-between items-center">
                        <div className="text-sm">
                          <span className="font-medium text-green-600">
                            {item.menuItemName}
                            {menuItem?.unitType && ` (${menuItem.unitType})`}
                          </span>
                          <span className="text-gray-500 ml-2">
                            {item.quantity}개
                          </span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                          ₩{itemTotal.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 특별 요청사항 */}
        {globalMemo && (
          <>
            <hr className="border-gray-100" />
            <div className="flex items-start gap-4">
              <span className="text-2xl">📝</span>
              <div>
                <p className="text-sm text-gray-500">요청사항</p>
                <p className="font-medium">{globalMemo}</p>
              </div>
            </div>
          </>
        )}

        <hr className="border-gray-100" />

        {/* 총 결제 금액 */}
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
