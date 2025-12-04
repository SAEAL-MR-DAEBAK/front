import React, { useState, useMemo } from 'react';
import { AdditionalMenuItem } from '../../../../stores/useOrderFlowStore';
import { MenuItemResponseDto } from '../../../../types/api';

// ============================================
// AdditionalMenuSection 컴포넌트
// ============================================
// 역할: 추가 메뉴 구성 변경 UI (검색, 드롭다운, 리스트)
// ============================================

interface AdditionalMenuSectionProps {
  allMenuItems: MenuItemResponseDto[];
  additionalMenuItems: AdditionalMenuItem[];
  menuCustomizations: Array<{ menuItemId: string }>;
  orderQuantity: number;
  onAddMenuItem: (menuItem: MenuItemResponseDto) => void;
  onRemoveMenuItem: (menuItemId: string) => void;
  onUpdateQuantity: (menuItemId: string, quantity: number) => void;
}

export const AdditionalMenuSection: React.FC<AdditionalMenuSectionProps> = ({
  allMenuItems,
  additionalMenuItems,
  menuCustomizations,
  orderQuantity,
  onAddMenuItem,
  onRemoveMenuItem,
  onUpdateQuantity,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // 필터링된 메뉴 아이템 (이미 추가된 것 제외)
  const filteredMenuItems = useMemo(() => {
    const existingMenuItemIds = new Set([
      ...menuCustomizations.map((item) => item.menuItemId),
      ...additionalMenuItems.map((item) => item.menuItemId),
    ]);

    return allMenuItems.filter(
      (item) =>
        !existingMenuItemIds.has(item.id) &&
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allMenuItems, menuCustomizations, additionalMenuItems, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setShowDropdown(value.trim().length > 0);
  };

  const handleMenuItemSelect = (menuItem: MenuItemResponseDto) => {
    onAddMenuItem(menuItem);
    setSearchQuery('');
    setShowDropdown(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
      <h3 className="font-bold text-gray-700 mb-4">추가 메뉴 구성 변경</h3>
      <p className="text-sm text-gray-500 mb-4">
        원래 디너에 포함되지 않는 메뉴를 추가할 수 있습니다
      </p>

      {/* 검색 입력 필드 */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          onFocus={() => searchQuery.trim().length > 0 && setShowDropdown(true)}
          placeholder="메뉴 이름을 입력하세요..."
          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />

        {/* 드롭다운 메뉴 */}
        {showDropdown && filteredMenuItems.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {filteredMenuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuItemSelect(item)}
                className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <p className="font-medium text-gray-900">
                  {item.name} {item.unitType && `(${item.unitType})`}
                </p>
                <p className="text-xs text-gray-500">
                  가격: ₩{item.unitPrice?.toLocaleString() || 'N/A'}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* 검색 결과 없음 */}
        {showDropdown && searchQuery.trim().length > 0 && filteredMenuItems.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4">
            <p className="text-gray-500 text-sm">검색 결과가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 추가된 메뉴 아이템 목록 */}
      {additionalMenuItems.length > 0 && (
        <div className="space-y-3">
          {additionalMenuItems.map((item) => {
            const menuItem = allMenuItems.find((mi) => mi.id === item.menuItemId);
            const unitPrice = menuItem?.unitPrice || 0;
            const totalCost = unitPrice * item.quantity * orderQuantity;

            return (
              <div
                key={item.menuItemId}
                className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-200"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {item.menuItemName}
                    {menuItem?.unitType && ` (${menuItem.unitType})`}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {menuItem && (
                      <>
                        <p className="text-xs text-gray-500">
                          단가: ₩{unitPrice.toLocaleString()}
                          {menuItem.unitType && ` / ${menuItem.unitType}`}
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    총 비용: ₩{totalCost.toLocaleString()}
                    {orderQuantity > 1 &&
                      ` (${unitPrice.toLocaleString()} × ${item.quantity}개 × ${orderQuantity}세트)`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onUpdateQuantity(item.menuItemId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.menuItemId, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-white border border-gray-300 hover:bg-gray-100 text-lg font-bold"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onRemoveMenuItem(item.menuItemId)}
                    className="ml-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    삭제
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

