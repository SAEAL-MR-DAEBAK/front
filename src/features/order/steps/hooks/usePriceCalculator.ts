import { useMemo } from 'react';
import { DinnerResponseDto, ServingStyleResponseDto, MenuItemResponseDto } from '../../../../types/api';
import { MenuItemCustomization, AdditionalMenuItem } from '../../../../stores/useOrderFlowStore';

// ============================================
// usePriceCalculator Hook
// ============================================
// 역할: 주문 가격 계산 로직
// ============================================

interface UsePriceCalculatorParams {
  selectedDinner: DinnerResponseDto | null;
  selectedStyle: ServingStyleResponseDto | null;
  quantity: number;
  menuCustomizations: MenuItemCustomization[];
  additionalMenuItems: AdditionalMenuItem[];
  allMenuItems: MenuItemResponseDto[];
}

export const usePriceCalculator = ({
  selectedDinner,
  selectedStyle,
  quantity,
  menuCustomizations,
  additionalMenuItems,
  allMenuItems,
}: UsePriceCalculatorParams) => {
  const currentPrice = useMemo(() => {
    if (!selectedDinner) return 0;

    const basePrice = selectedDinner.basePrice;
    const stylePrice = selectedStyle?.extraPrice || 0;
    const baseTotal = (basePrice + stylePrice) * quantity;

    // 메뉴 구성 변경으로 인한 추가 가격 계산
    const menuCustomizationPrice = menuCustomizations.reduce((sum, item) => {
      const menuItem = allMenuItems.find((mi) => mi.id === item.menuItemId);
      if (menuItem) {
        const quantityDiff = item.currentQuantity - item.defaultQuantity;
        if (quantityDiff > 0) {
          return sum + (menuItem.unitPrice || 0) * quantityDiff * quantity;
        }
      }
      return sum;
    }, 0);

    // 추가 메뉴 아이템 가격 계산
    const additionalPrice = additionalMenuItems.reduce((sum, item) => {
      const menuItem = allMenuItems.find((mi) => mi.id === item.menuItemId);
      if (menuItem) {
        return sum + (menuItem.unitPrice || 0) * item.quantity * quantity;
      }
      return sum;
    }, 0);

    return baseTotal + menuCustomizationPrice + additionalPrice;
  }, [selectedDinner, selectedStyle, quantity, menuCustomizations, additionalMenuItems, allMenuItems]);

  return { currentPrice };
};

