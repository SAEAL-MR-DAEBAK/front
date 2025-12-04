import { create } from 'zustand';
import { DinnerResponseDto, ServingStyleResponseDto, ProductResponseDto } from '../types/api';

// ============================================
// useOrderFlowStore
// ============================================
// 역할: 단계별 주문 플로우 상태 관리
// 단계: 인트로 → 주소선택 → 디너선택 → 주문옵션 → 서빙스타일 → 결제
// ============================================

// 주문 플로우 단계 정의
// - intro: 웰컴 화면 (미스터 대박 소개)
// - address: 배달 주소 선택
// - dinner: 디너 종류 선택
// - style: 서빙 스타일 선택
// - customize: 수량, 메뉴 커스터마이징 (디너와 서빙스타일 선택 후 진행)
// - checkout: 결제 확인
export type OrderStep = 'intro' | 'address' | 'dinner' | 'style' | 'customize' | 'checkout';

// 메뉴 아이템 커스터마이징
export interface MenuItemCustomization {
  menuItemId: string;
  menuItemName: string;
  defaultQuantity: number;
  currentQuantity: number;
}

// 추가 메뉴 아이템 (원래 디너에 포함되지 않는 메뉴)
export interface AdditionalMenuItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
}

interface OrderFlowState {
  // ----------------------------------------
  // 현재 단계
  // ----------------------------------------
  currentStep: OrderStep;

  // ----------------------------------------
  // 단계별 선택 데이터
  // ----------------------------------------
  // 1단계: 주소
  selectedAddress: string;

  // 2단계: 디너
  selectedDinner: DinnerResponseDto | null;

  // 3단계: 서빙 스타일
  selectedStyle: ServingStyleResponseDto | null;

  // 생성된 Product (style 단계에서 생성)
  createdProduct: ProductResponseDto | null;

  // 4단계: 커스터마이징
  quantity: number;
  memo: string;
  menuCustomizations: MenuItemCustomization[];
  additionalMenuItems: AdditionalMenuItem[];

  // ----------------------------------------
  // 액션
  // ----------------------------------------
  // 단계 이동
  setStep: (step: OrderStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // 데이터 설정
  setAddress: (address: string) => void;
  setDinner: (dinner: DinnerResponseDto) => void;
  setStyle: (style: ServingStyleResponseDto | null) => void;
  setCreatedProduct: (product: ProductResponseDto | null) => void;
  setQuantity: (quantity: number) => void;
  setMemo: (memo: string) => void;
  setMenuCustomizations: (customizations: MenuItemCustomization[]) => void;
  updateMenuItemQuantity: (menuItemId: string, quantity: number) => void;
  setAdditionalMenuItems: (items: AdditionalMenuItem[]) => void;
  addAdditionalMenuItem: (menuItemId: string, menuItemName: string) => void;
  removeAdditionalMenuItem: (menuItemId: string) => void;
  updateAdditionalMenuItemQuantity: (menuItemId: string, quantity: number) => void;

  // 초기화
  resetOrder: () => void;

  // 총 가격 계산
  getTotalPrice: () => number;
}

// 단계 순서 정의 (intro부터 시작)
// dinner → style → customize 순서: 디너와 서빙스타일 선택 후 주문 옵션 커스터마이징
const STEP_ORDER: OrderStep[] = ['intro', 'address', 'dinner', 'style', 'customize', 'checkout'];

export const useOrderFlowStore = create<OrderFlowState>((set, get) => ({
  // ----------------------------------------
  // 초기 상태 (intro 화면부터 시작)
  // ----------------------------------------
  currentStep: 'intro',
  selectedAddress: '',
  selectedDinner: null,
  selectedStyle: null,
  createdProduct: null,
  quantity: 1,
  memo: '',
  menuCustomizations: [],
  additionalMenuItems: [],

  // ----------------------------------------
  // 단계 이동 액션
  // ----------------------------------------
  setStep: (step) => set({ currentStep: step }),

  nextStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      set({ currentStep: STEP_ORDER[currentIndex + 1] });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      set({ currentStep: STEP_ORDER[currentIndex - 1] });
    }
  },

  // ----------------------------------------
  // 데이터 설정 액션
  // ----------------------------------------
  setAddress: (address) => set({ selectedAddress: address }),

  setDinner: (dinner) => set({ selectedDinner: dinner }),

  setStyle: (style) => set({ selectedStyle: style || null }),

  setCreatedProduct: (product) => set({ createdProduct: product }),

  setQuantity: (quantity) => set({ quantity: Math.max(1, quantity) }),

  setMemo: (memo) => set({ memo }),

  setMenuCustomizations: (customizations) => set({ menuCustomizations: customizations }),

  setAdditionalMenuItems: (items) => set({ additionalMenuItems: items }),

  updateMenuItemQuantity: (menuItemId, quantity) => {
    const { menuCustomizations } = get();
    const updated = menuCustomizations.map((item) =>
      item.menuItemId === menuItemId
        ? { ...item, currentQuantity: Math.max(0, quantity) }
        : item
    );
    set({ menuCustomizations: updated });
  },

  addAdditionalMenuItem: (menuItemId, menuItemName) => {
    const { additionalMenuItems } = get();
    // 이미 추가된 메뉴 아이템인지 확인
    const exists = additionalMenuItems.some((item) => item.menuItemId === menuItemId);
    if (!exists) {
      set({
        additionalMenuItems: [
          ...additionalMenuItems,
          { menuItemId, menuItemName, quantity: 1 },
        ],
      });
    }
  },

  removeAdditionalMenuItem: (menuItemId) => {
    const { additionalMenuItems } = get();
    set({
      additionalMenuItems: additionalMenuItems.filter(
        (item) => item.menuItemId !== menuItemId
      ),
    });
  },

  updateAdditionalMenuItemQuantity: (menuItemId, quantity) => {
    const { additionalMenuItems } = get();
    const updated = additionalMenuItems.map((item) =>
      item.menuItemId === menuItemId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    );
    set({ additionalMenuItems: updated });
  },

  // ----------------------------------------
  // 초기화 (intro 화면으로 돌아감)
  // ----------------------------------------
  resetOrder: () =>
    set({
      currentStep: 'intro',
      selectedAddress: '',
      selectedDinner: null,
      selectedStyle: null,
      createdProduct: null,
      quantity: 1,
      memo: '',
      menuCustomizations: [],
      additionalMenuItems: [],
    }),

  // ----------------------------------------
  // 총 가격 계산
  // ----------------------------------------
  getTotalPrice: () => {
    const { selectedDinner, selectedStyle, quantity } = get();
    if (!selectedDinner) return 0;

    const basePrice = selectedDinner.basePrice;
    const stylePrice = selectedStyle?.extraPrice || 0;

    return (basePrice + stylePrice) * quantity;
  },
}));
