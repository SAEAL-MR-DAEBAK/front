// 입력 타입
export type InputType = 'text' | 'voice';

// UI 액션 (백엔드에서 결정)
export type UiAction =
  | 'NONE'                   // 특별한 UI 액션 없음
  | 'SHOW_CONFIRM_MODAL'     // 장바구니 담기 확인 모달
  | 'SHOW_CANCEL_CONFIRM'    // 주문 취소 확인 모달
  | 'UPDATE_ORDER_LIST';     // 임시장바구니 업데이트

// 메시지 (UI 표시용)
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: InputType;
}

// 대화 히스토리 (API 전송용)
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 주문 아이템
export interface OrderItem {
  dinnerId: string;
  dinnerName: string;
  servingStyleId?: string;
  servingStyleName?: string;
  quantity: number;
  basePrice: number;      // dinner 기본 가격 (스타일 변경 시 필요)
  unitPrice: number;
  totalPrice: number;
}

// 채팅 요청 (Stateless - 히스토리 포함)
export interface ChatRequest {
  message?: string;
  audioBase64?: string;
  audioFormat?: string;
  conversationHistory: ChatMessage[];
  currentOrder: OrderItem[];
}

// 채팅 응답
export interface ChatResponse {
  userMessage: string;
  assistantMessage: string;
  uiAction: UiAction;          // UI 액션 (백엔드에서 결정)
  currentOrder: OrderItem[];
  totalPrice: number;
  selectedAddress?: string;    // 선택된 배달 주소
}

// 로그인 요청
export interface LoginRequest {
  username: string;
  password: string;
}

// 로그인 응답
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    phoneNumber: string;
    addresses: string[];
    cards: UserCard[];
    authority: string;
    loyaltyLevel: string;
    visitCount: number;
    totalSpent: string;
  };
}

// 사용자 카드 정보
export interface UserCard {
  id: string;
  cardBrand: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName: string;
  cvv: string;
  isDefault: boolean;
}

