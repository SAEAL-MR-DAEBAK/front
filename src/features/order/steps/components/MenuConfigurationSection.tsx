import React from 'react';
import { MenuItemCustomization } from '../../../../stores/useOrderFlowStore';
import { MenuItemResponseDto } from '../../../../types/api';

// ============================================
// MenuConfigurationSection 컴포넌트
// ============================================
// 역할: 기본 메뉴 구성 변경 UI
// ============================================

interface MenuConfigurationSectionProps {
  menuCustomizations: MenuItemCustomization[];
  allMenuItems: MenuItemResponseDto[];
  orderQuantity: number;
  onQuantityChange: (menuItemId: string, newQuantity: number) => void;
}

export const MenuConfigurationSection: React.FC<MenuConfigurationSectionProps> = ({
  menuCustomizations,
  allMenuItems,
  orderQuantity,
  onQuantityChange,
}) => {
  if (menuCustomizations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h3 className="font-bold text-gray-700 mb-4">메뉴 구성 변경</h3>
      <p className="text-sm text-gray-500 mb-4">
        각 항목의 수량을 조절할 수 있습니다 (추가 비용 발생 가능)
      </p>
      <div className="space-y-4">
        {menuCustomizations.map((item) => {
          const menuItem = allMenuItems.find((mi) => mi.id === item.menuItemId);
          const unitPrice = menuItem?.unitPrice || 0;
          const quantityDiff = item.currentQuantity - item.defaultQuantity;
          const additionalCost = quantityDiff > 0 ? unitPrice * quantityDiff * orderQuantity : 0;

          return (
            <div
              key={item.menuItemId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
            >
              <div className="flex-1">
                <p className="font-medium">{item.menuItemName}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">기본: {item.defaultQuantity}개</p>
                  {menuItem && (
                    <>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500">
                        단가: ₩{unitPrice.toLocaleString()}
                        {menuItem.unitType && ` / ${menuItem.unitType}`}
                      </p>
                    </>
                  )}
                </div>
                {additionalCost > 0 && (
                  <p className="text-xs text-green-600 font-medium mt-1">
                    추가 비용: ₩{additionalCost.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onQuantityChange(item.menuItemId, item.currentQuantity - 1)}
                  disabled={item.currentQuantity <= 0}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold">{item.currentQuantity}</span>
                <button
                  onClick={() => onQuantityChange(item.menuItemId, item.currentQuantity + 1)}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

