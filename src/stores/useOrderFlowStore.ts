import { create } from 'zustand';
import { DinnerResponseDto, ServingStyleResponseDto, ProductResponseDto } from '../types/api';

// ============================================
// useOrderFlowStore
// ============================================
// 역할: 단계별 주문 플로우 상태 관리 (여러 디너 지원)
// 단계: 인트로 → 주소선택 → 디너선택(수량) → 스타일선택 → 커스터마이징 → 결제
// ============================================

// 주문 플로우 단계 정의
export type OrderStep = 'intro' | 'address' | 'dinner' | 'style' | 'customize' | 'checkout';

// 메뉴 아이템 커스터마이징
export interface MenuItemCustomization {
  menuItemId: string;
  menuItemName: string;
  defaultQuantity: number;
  currentQuantity: number;
}

// 추가 메뉴 아이템 (공통 추가 메뉴)
export interface AdditionalMenuItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
}

// 디너 인스턴스 (각 디너의 개별 주문)
export interface DinnerInstance {
  id: string;  // 인스턴스 고유 ID
  style: ServingStyleResponseDto;
  product: ProductResponseDto;  // 스타일 선택 후 생성 (quantity=1)
  menuCustomizations: MenuItemCustomization[];  // CustomizeStep에서 설정
}

// 선택된 디너 아이템 (DinnerStep에서 수량과 함께 선택)
export interface SelectedDinnerItem {
  id: string;  // 아이템 고유 ID
  dinner: DinnerResponseDto;
  quantity: number;  // DinnerStep에서 결정
  instances: DinnerInstance[];  // StyleStep에서 각 인스턴스마다 스타일 선택 및 Product 생성
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

  // 2단계: 디너 선택 (복수 선택 + 수량)
  selectedDinners: SelectedDinnerItem[];

  // 4단계: 커스터마이징 (공통 설정)
  globalAdditionalMenuItems: AdditionalMenuItem[];
  globalMemo: string;

  // 배달 희망 시간
  requestedDeliveryTime: string;  // ISO 형식 날짜/시간 문자열

  // ----------------------------------------
  // 액션
  // ----------------------------------------
  // 단계 이동
  setStep: (step: OrderStep) => void;
  nextStep: () => void;
  prevStep: () => void;

  // 주소 설정
  setAddress: (address: string) => void;

  // 디너 관리
  addDinner: (dinner: DinnerResponseDto, quantity: number) => void;
  removeDinner: (dinnerItemId: string) => void;
  updateDinnerQuantity: (dinnerItemId: string, quantity: number) => void;

  // 스타일 및 Product 관리
  setInstanceStyle: (dinnerItemId: string, instanceIndex: number, style: ServingStyleResponseDto) => void;
  setInstanceProduct: (dinnerItemId: string, instanceIndex: number, product: ProductResponseDto) => void;

  // 커스터마이징 관리
  setInstanceMenuCustomizations: (dinnerItemId: string, instanceIndex: number, customizations: MenuItemCustomization[]) => void;
  updateInstanceMenuItemQuantity: (dinnerItemId: string, instanceIndex: number, menuItemId: string, quantity: number) => void;

  // 공통 설정 관리
  setGlobalMemo: (memo: string) => void;
  setGlobalAdditionalMenuItems: (items: AdditionalMenuItem[]) => void;
  addGlobalAdditionalMenuItem: (menuItemId: string, menuItemName: string) => void;
  removeGlobalAdditionalMenuItem: (menuItemId: string) => void;
  updateGlobalAdditionalMenuItemQuantity: (menuItemId: string, quantity: number) => void;

  // 배달 희망 시간 설정
  setRequestedDeliveryTime: (time: string) => void;

  // 초기화
  resetOrder: () => void;

  // 총 가격 계산
  getTotalPrice: () => number;
}

// 단계 순서 정의
const STEP_ORDER: OrderStep[] = ['intro', 'address', 'dinner', 'style', 'customize', 'checkout'];

// UUID 생성 헬퍼
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useOrderFlowStore = create<OrderFlowState>((set, get) => ({
  // ----------------------------------------
  // 초기 상태
  // ----------------------------------------
  currentStep: 'intro',
  selectedAddress: '',
  selectedDinners: [],
  globalAdditionalMenuItems: [],
  globalMemo: '',
  requestedDeliveryTime: '',

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
  // 주소 설정
  // ----------------------------------------
  setAddress: (address) => set({ selectedAddress: address }),

  // ----------------------------------------
  // 디너 관리
  // ----------------------------------------
  addDinner: (dinner, quantity) => {
    const { selectedDinners } = get();
    // 이미 같은 디너가 있는지 확인
    const existingIndex = selectedDinners.findIndex(item => item.dinner.id === dinner.id);
    
    if (existingIndex >= 0) {
      // 기존 디너의 수량 업데이트
      const updated = [...selectedDinners];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + quantity,
        instances: []  // 수량 변경 시 인스턴스 초기화
      };
      set({ selectedDinners: updated });
    } else {
      // 새로운 디너 추가
      set({
        selectedDinners: [
          ...selectedDinners,
          {
            id: generateId(),
            dinner,
            quantity,
            instances: []
          }
        ]
      });
    }
  },

  removeDinner: (dinnerItemId) => {
    const { selectedDinners } = get();
    set({
      selectedDinners: selectedDinners.filter(item => item.id !== dinnerItemId)
    });
  },

  updateDinnerQuantity: (dinnerItemId, quantity) => {
    const { selectedDinners } = get();
    if (quantity <= 0) {
      get().removeDinner(dinnerItemId);
      return;
    }
    
    const updated = selectedDinners.map(item => {
      if (item.id === dinnerItemId) {
        return {
          ...item,
          quantity,
          instances: []  // 수량 변경 시 인스턴스 초기화
        };
      }
      return item;
    });
    set({ selectedDinners: updated });
  },

  // ----------------------------------------
  // 스타일 및 Product 관리
  // ----------------------------------------
  setInstanceStyle: (dinnerItemId, instanceIndex, style) => {
    const { selectedDinners } = get();
    const updated = selectedDinners.map(item => {
      if (item.id === dinnerItemId) {
        const instances = [...item.instances];
        // 인스턴스가 없으면 생성
        while (instances.length <= instanceIndex) {
          instances.push({
            id: generateId(),
            style: null as any,
            product: null as any,
            menuCustomizations: []
          });
        }
        instances[instanceIndex] = {
          ...instances[instanceIndex],
          style,
          // 스타일 변경 시 Product 초기화
          product: null as any,
          menuCustomizations: []
        };
        return { ...item, instances };
      }
      return item;
    });
    set({ selectedDinners: updated });
  },

  setInstanceProduct: (dinnerItemId, instanceIndex, product) => {
    const { selectedDinners } = get();
    const updated = selectedDinners.map(item => {
      if (item.id === dinnerItemId) {
        const instances = [...item.instances];
        if (instances[instanceIndex]) {
          instances[instanceIndex] = {
            ...instances[instanceIndex],
            product
          };
        }
        return { ...item, instances };
      }
      return item;
    });
    set({ selectedDinners: updated });
  },

  // ----------------------------------------
  // 커스터마이징 관리
  // ----------------------------------------
  setInstanceMenuCustomizations: (dinnerItemId, instanceIndex, customizations) => {
    const { selectedDinners } = get();
    const updated = selectedDinners.map(item => {
      if (item.id === dinnerItemId) {
        const instances = [...item.instances];
        if (instances[instanceIndex]) {
          instances[instanceIndex] = {
            ...instances[instanceIndex],
            menuCustomizations: customizations
          };
        }
        return { ...item, instances };
      }
      return item;
    });
    set({ selectedDinners: updated });
  },

  updateInstanceMenuItemQuantity: (dinnerItemId, instanceIndex, menuItemId, quantity) => {
    const { selectedDinners } = get();
    const updated = selectedDinners.map(item => {
      if (item.id === dinnerItemId) {
        const instances = [...item.instances];
        if (instances[instanceIndex]) {
          const customizations = instances[instanceIndex].menuCustomizations.map(c =>
            c.menuItemId === menuItemId
              ? { ...c, currentQuantity: Math.max(0, quantity) }
              : c
          );
          instances[instanceIndex] = {
            ...instances[instanceIndex],
            menuCustomizations: customizations
          };
        }
        return { ...item, instances };
      }
      return item;
    });
    set({ selectedDinners: updated });
  },

  // ----------------------------------------
  // 공통 설정 관리
  // ----------------------------------------
  setGlobalMemo: (memo) => set({ globalMemo: memo }),

  setGlobalAdditionalMenuItems: (items) => set({ globalAdditionalMenuItems: items }),

  addGlobalAdditionalMenuItem: (menuItemId, menuItemName) => {
    const { globalAdditionalMenuItems } = get();
    const exists = globalAdditionalMenuItems.some(item => item.menuItemId === menuItemId);
    if (!exists) {
      set({
        globalAdditionalMenuItems: [
          ...globalAdditionalMenuItems,
          { menuItemId, menuItemName, quantity: 1 }
        ]
      });
    }
  },

  removeGlobalAdditionalMenuItem: (menuItemId) => {
    const { globalAdditionalMenuItems } = get();
    set({
      globalAdditionalMenuItems: globalAdditionalMenuItems.filter(item => item.menuItemId !== menuItemId)
    });
  },

  updateGlobalAdditionalMenuItemQuantity: (menuItemId, quantity) => {
    const { globalAdditionalMenuItems } = get();
    const updated = globalAdditionalMenuItems.map(item =>
      item.menuItemId === menuItemId
        ? { ...item, quantity: Math.max(1, quantity) }
        : item
    );
    set({ globalAdditionalMenuItems: updated });
  },

  // ----------------------------------------
  // 배달 희망 시간 설정
  // ----------------------------------------
  setRequestedDeliveryTime: (time) => set({ requestedDeliveryTime: time }),

  // ----------------------------------------
  // 초기화
  // ----------------------------------------
  resetOrder: () =>
    set({
      currentStep: 'intro',
      selectedAddress: '',
      selectedDinners: [],
      globalAdditionalMenuItems: [],
      globalMemo: '',
      requestedDeliveryTime: ''
    }),

  // ----------------------------------------
  // 총 가격 계산 (각 Product 가격만, 공통 추가 메뉴는 제외)
  // 공통 추가 메뉴 가격은 CustomizeStep에서 별도로 계산
  // ----------------------------------------
  getTotalPrice: () => {
    const { selectedDinners } = get();
    
    // 모든 Product의 가격 합산
    let total = 0;
    selectedDinners.forEach(item => {
      item.instances.forEach(instance => {
        if (instance.product) {
          total += Number(instance.product.totalPrice) || 0;
        }
      });
    });

    return total;
  }
}));
