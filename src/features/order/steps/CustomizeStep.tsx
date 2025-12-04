import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { DinnerMenuItemResponseDto, MenuItemResponseDto } from '../../../types/api';
import { QuantitySelector } from './components/QuantitySelector';
import { MenuConfigurationSection } from './components/MenuConfigurationSection';
import { AdditionalMenuSection } from './components/AdditionalMenuSection';
import { SpecialRequestSection } from './components/SpecialRequestSection';
import { usePriceCalculator } from './hooks/usePriceCalculator';

// ============================================
// CustomizeStep 컴포넌트
// ============================================
// 역할: 4단계 - 주문 커스터마이징 (수량, 메뉴 구성, 특별 요청)
// 순서: 디너선택 → 서빙스타일 → [현재] 주문옵션 → 결제
// API: GET /api/dinners/{dinnerId}/default-menu-items
// ============================================

export const CustomizeStep: React.FC = () => {
  const {
    selectedDinner,
    selectedStyle,
    createdProduct,
    quantity,
    memo,
    menuCustomizations,
    additionalMenuItems,
    setQuantity,
    setMemo,
    setMenuCustomizations,
    updateMenuItemQuantity,
    addAdditionalMenuItem,
    removeAdditionalMenuItem,
    updateAdditionalMenuItemQuantity,
    setAdditionalMenuItems,
    setCreatedProduct,
    nextStep,
    prevStep,
  } = useOrderFlowStore();

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allMenuItems, setAllMenuItems] = useState<MenuItemResponseDto[]>([]);
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);

  // ----------------------------------------
  // API 호출: 디너의 기본 메뉴 아이템 로드
  // ----------------------------------------
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!selectedDinner) return;

      // 이미 menuCustomizations가 있으면 다시 로드하지 않음 (상태 보존)
      if (menuCustomizations.length > 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<DinnerMenuItemResponseDto[]>(
          `/dinners/${selectedDinner.id}/default-menu-items`
        );

        const customizations = response.data.map((item) => ({
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          defaultQuantity: item.defaultQuantity,
          currentQuantity: item.defaultQuantity,
        }));

        setMenuCustomizations(customizations);
      } catch (err) {
        console.error('메뉴 아이템 로딩 실패:', err);
        setError('메뉴 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuItems();
  }, [selectedDinner, setMenuCustomizations, menuCustomizations.length]);

  // ----------------------------------------
  // API 호출: 모든 메뉴 아이템 로드 (추가 메뉴 검색용)
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

  // ----------------------------------------
  // 가격 계산
  // ----------------------------------------
  const { currentPrice } = usePriceCalculator({
    selectedDinner,
    selectedStyle,
    quantity,
    menuCustomizations,
    additionalMenuItems,
    allMenuItems,
  });

  // ----------------------------------------
  // 이벤트 핸들러
  // ----------------------------------------
  const handleMenuItemSelect = (menuItem: MenuItemResponseDto) => {
    addAdditionalMenuItem(menuItem.id, menuItem.name);
  };

  // 다음 단계로 넘어가기 전에 product 업데이트
  const handleNext = async () => {
    if (!createdProduct) {
      alert('상품 정보가 없습니다. 이전 단계로 돌아가주세요.');
      return;
    }

    try {
      setIsUpdatingProduct(true);
      setError(null);

      // 1. 메뉴 구성 변경: 기본 메뉴의 수량 변경 반영 (0인 것은 제외하고 기본 수량으로 되돌림)
      for (const customization of menuCustomizations) {
        const defaultMenuItem = createdProduct.productMenuItems.find(
          (pmi) => pmi.menuItemId === customization.menuItemId
        );

        // 수량이 0이면 기본 수량으로 되돌리기 (삭제하지 않음)
        if (customization.currentQuantity === 0) {
          if (defaultMenuItem) {
            await apiClient.patch(
              `/products/${createdProduct.id}/menu-items/${customization.menuItemId}`,
              { quantity: customization.defaultQuantity }
            );
          }
        } else if (defaultMenuItem && customization.currentQuantity !== customization.defaultQuantity) {
          // 수량이 변경된 경우 업데이트
          await apiClient.patch(
            `/products/${createdProduct.id}/menu-items/${customization.menuItemId}`,
            { quantity: customization.currentQuantity }
          );
        }
      }

      // 2. 추가 메뉴 아이템 추가/수정 (0인 것은 삭제)
      for (const additionalItem of additionalMenuItems) {
        const existingItem = createdProduct.productMenuItems.find(
          (pmi) => pmi.menuItemId === additionalItem.menuItemId
        );

        if (additionalItem.quantity === 0) {
          // 수량이 0이면 삭제 (추가 메뉴는 삭제 가능)
          if (existingItem) {
            try {
              await apiClient.delete(
                `/products/${createdProduct.id}/menu-items/${additionalItem.menuItemId}`
              );
            } catch (err: any) {
              // 404 에러는 무시 (이미 삭제된 경우)
              if (err.response?.status !== 404) {
                console.warn('추가 메뉴 아이템 삭제 실패:', err);
              }
            }
          }
        } else if (!existingItem) {
          // 새로운 메뉴 아이템 추가
          await apiClient.post(
            `/products/${createdProduct.id}/menu-items`,
            {
              menuItemId: additionalItem.menuItemId,
              quantity: additionalItem.quantity,
            }
          );
        } else {
          // 이미 있는 경우 수량만 업데이트
          await apiClient.patch(
            `/products/${createdProduct.id}/menu-items/${additionalItem.menuItemId}`,
            { quantity: additionalItem.quantity }
          );
        }
      }

      // 3. 업데이트된 product의 menuItems 조회
      const menuItemsResponse = await apiClient.get(
        `/products/${createdProduct.id}/menu-items`
      );

      // product 정보 업데이트 (menuItems만 업데이트)
      const updatedProduct = {
        ...createdProduct,
        productMenuItems: menuItemsResponse.data,
      };

      setCreatedProduct(updatedProduct);

      // 다음 단계로 이동
      nextStep();
    } catch (err: any) {
      console.error('상품 업데이트 실패:', err);
      const errorMessage = err.response?.data?.message || '상품 업데이트에 실패했습니다. 다시 시도해주세요.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsUpdatingProduct(false);
    }
  };

  // ----------------------------------------
  // 렌더링: 로딩
  // ----------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">메뉴 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 에러
  // ----------------------------------------
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

  // ----------------------------------------
  // 렌더링: 메인
  // ----------------------------------------
  return (
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          주문을 <span className="text-green-600">커스터마이징</span> 하세요
        </h2>
        <p className="text-gray-500">수량, 메뉴 구성을 변경할 수 있습니다</p>
      </div>

      {/* 선택 요약 및 현재 가격 */}
      <div className="bg-green-50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍽️</span>
            <div>
              <p className="font-bold">{selectedDinner?.dinnerName}</p>
              <p className="text-sm text-gray-500">{selectedStyle?.styleName} 스타일</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">현재 총 가격</p>
            <p className="text-2xl font-bold text-green-600">
              ₩{currentPrice.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 수량 조절 */}
      <QuantitySelector
        quantity={quantity}
        onDecrease={() => setQuantity(quantity - 1)}
        onIncrease={() => setQuantity(quantity + 1)}
      />

      {/* 메뉴 구성 변경 */}
      <MenuConfigurationSection
        menuCustomizations={menuCustomizations}
        allMenuItems={allMenuItems}
        orderQuantity={quantity}
        onQuantityChange={updateMenuItemQuantity}
      />

      {/* 추가 메뉴 구성 변경 */}
      <AdditionalMenuSection
        allMenuItems={allMenuItems}
        additionalMenuItems={additionalMenuItems}
        menuCustomizations={menuCustomizations}
        orderQuantity={quantity}
        onAddMenuItem={handleMenuItemSelect}
        onRemoveMenuItem={removeAdditionalMenuItem}
        onUpdateQuantity={updateAdditionalMenuItemQuantity}
      />

      {/* 특별 요청사항 */}
      <SpecialRequestSection memo={memo} onMemoChange={setMemo} />

      {/* 버튼 영역 */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            // 메뉴 구성이 변경되었는지 확인
            const hasMenuChanges = menuCustomizations.some(
              (item) => item.currentQuantity !== item.defaultQuantity
            ) || additionalMenuItems.length > 0;

            if (hasMenuChanges) {
              const confirmed = window.confirm(
                '이전 단계로 돌아가면 수정한 메뉴 구성이 초기화됩니다. 계속하시겠습니까?'
              );
              if (confirmed) {
                // 메뉴 구성 초기화
                setMenuCustomizations(
                  menuCustomizations.map((item) => ({
                    ...item,
                    currentQuantity: item.defaultQuantity,
                  }))
                );
                setAdditionalMenuItems([]);
                prevStep();
              }
            } else {
              prevStep();
            }
          }}
          className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
        >
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={isUpdatingProduct}
          className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all ${
            isUpdatingProduct
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isUpdatingProduct ? '업데이트 중...' : '다음 단계로'}
        </button>
      </div>
    </div>
  );
};
