// ============================================
// src/types/api.ts
// API 응답/요청 타입 정의 (OpenAPI 스펙 기반)
// ============================================

// ============================================
// 사용자 관련 타입
// ============================================

export interface UserResponseDto {
  id: string;
  email: string;
  username: string;
  displayName: string;
  phoneNumber: string;
  address: string;
  authority: string;
  loyaltyLevel: string;
  visitCount: number;
  totalSpent: string;
}

export interface RegisterDto {
  email: string;
  username: string;
  password: string;
  displayName: string;
  phoneNumber: string;
  address: string;
}

// ============================================
// 사용자 주소 관련 타입 (백엔드 API 추가 예정)
// ============================================

export interface UserAddressDto {
  id: string;
  address: string;
  nickname?: string;
  isDefault: boolean;
}

export interface AddUserAddressRequest {
  address: string;
  nickname?: string;
  isDefault?: boolean;
}

// ============================================
// 회원정보 수정 관련 타입 (백엔드 API 추가 예정)
// ============================================

export interface UpdateUserProfileRequest {
  displayName?: string;
  phoneNumber?: string;
  address?: string;
  email?: string;
}

// ============================================
// 결제수단 관련 타입 (백엔드 API 추가 예정)
// ============================================

export interface UserCardResponseDto {
  id: string;
  cardBrand: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName: string;
  cvv: string;
  isDefault: boolean;
}

export interface AddCardRequest {
  cardBrand: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName: string;
  cvv: string;
  isDefault?: boolean;
}

// 하위 호환성을 위한 별칭
export type PaymentMethodDto = UserCardResponseDto;
export type AddPaymentMethodRequest = AddCardRequest;

// ============================================
// 인증 관련 타입
// ============================================

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: UserResponseDto;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

// ============================================
// 디너 관련 타입
// ============================================

export interface DinnerResponseDto {
  id: string;
  dinnerName: string;
  description: string;
  basePrice: number;
  active: boolean;
  imageUrl?: string; // 프론트엔드 확장 필드
}

export interface CreateDinnerRequest {
  dinnerName: string;
  description?: string;
  basePrice: number;
  isActive?: boolean;
}

export interface DinnerMenuItemResponseDto {
  menuItemId: string;
  menuItemName: string;
  defaultQuantity: number;
}

export interface CreateDinnerMenuItemRequest {
  dinnerId: string;
  menuItemId: string;
  defaultQuantity: number;
}

// ============================================
// 서빙 스타일 관련 타입
// ============================================

export interface ServingStyleResponseDto {
  id: string;
  styleName: string;
  description: string;
  extraPrice: number;
  active: boolean;
}

export interface CreateServingStyleRequest {
  styleName: string;
  description?: string;
  extraPrice: number;
  isActive?: boolean;
}

// ============================================
// 메뉴 아이템 관련 타입
// ============================================

export interface MenuItemResponseDto {
  id: string;
  name: string;
  stock: number;
  unitPrice: number;
  unitType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemRequest {
  name: string;
  stock: number;
}

export interface UpdateMenuItemStockRequest {
  stock: number;
}

// ============================================
// 상품(Product) 관련 타입
// ============================================

export interface ProductMenuItemResponseDto {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CreateProductRequest {
  dinnerId: string;
  servingStyleId: string;
  quantity: number;
  memo?: string;
  productName?: string;
  address: string;
}

export interface CreateAdditionalMenuProductRequest {
  menuItemId: string;
  quantity: number;
  memo?: string;
  address: string;
}

export interface ProductResponseDto {
  id: string;
  productName: string;
  dinnerId?: string | null;  // ADDITIONAL_MENU_PRODUCT인 경우 null
  dinnerName?: string | null;
  servingStyleId?: string | null;  // ADDITIONAL_MENU_PRODUCT인 경우 null
  servingStyleName?: string | null;
  totalPrice: number;
  quantity: number;
  memo: string;
  address?: string;
  productMenuItems: ProductMenuItemResponseDto[];
}

// ============================================
// 장바구니(Cart) 관련 타입
// ============================================

export interface CartItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateCartRequest {
  items: CartItemRequest[];
  deliveryAddress?: string;
  deliveryMethod?: 'Pickup' | 'Delivery';
  memo?: string;
  expiresAt?: string;
}

export interface CartItemResponseDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartResponseDto {
  id: string;
  userId: string;
  items: CartItemResponseDto[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  deliveryAddress: string;
  deliveryMethod: 'Pickup' | 'Delivery';
  memo: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// 주문(Order) 관련 타입
// ============================================

export type OrderStatus = 'PLACED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
export type DeliveryStatus = 'READY' | 'COOKING' | 'SHIPPING' | 'DELIVERED' | 'PICKUP_READY' | 'PICKED_UP';
export type DeliveryMethod = 'Pickup' | 'Delivery';

export type ProductType = 'DINNER_PRODUCT' | 'ADDITIONAL_MENU_PRODUCT';

export interface OrderItemResponseDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  optionSummary: string;
  productType?: ProductType; // Product 타입 (DINNER_PRODUCT, ADDITIONAL_MENU_PRODUCT)
  menuItems?: ProductMenuItemResponseDto[]; // Product의 메뉴 아이템 목록
}

export interface OrderResponseDto {
  id: string;
  orderNumber: string;
  userId?: string; // 사용자 ID (검색용)
  username?: string; // 사용자명 (검색용)
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  currency: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string;
  deliveryMemo: string;
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  paymentTransactionId: string;
  memo: string;
  rejectionReason?: string; // 관리자 거절 사유
  requestedDeliveryTime?: string; // 희망 배달 시간
  occasionType?: string; // 기념일 종류
  orderedAt: string;
  updatedAt: string;
  items: OrderItemResponseDto[];
}

export interface ApproveOrderRequest {
  approved: boolean;
  rejectionReason?: string;
}

export interface UpdateDeliveryStatusRequest {
  deliveryStatus: DeliveryStatus;
}

// ============================================
// 음성 주문(Voice Order) 관련 타입
// ============================================

// 백엔드 OrderFlowState와 동기화
export enum OrderFlowState {
  IDLE = 'IDLE',                                     // 대기 상태
  SELECTING_ADDRESS = 'SELECTING_ADDRESS',           // 배달 주소 선택 중
  SELECTING_MENU = 'SELECTING_MENU',                 // 디너 메뉴 선택 중
  SELECTING_STYLE = 'SELECTING_STYLE',               // 서빙 스타일 선택 중
  SELECTING_QUANTITY = 'SELECTING_QUANTITY',         // 수량 선택 중
  ASKING_MORE_DINNER = 'ASKING_MORE_DINNER',         // 추가 디너 주문 여부 확인
  CUSTOMIZING_MENU = 'CUSTOMIZING_MENU',             // 개별 상품 메뉴 구성 커스터마이징
  SELECTING_ADDITIONAL_MENU = 'SELECTING_ADDITIONAL_MENU',  // 추가 메뉴 아이템 선택
  ENTERING_MEMO = 'ENTERING_MEMO',                   // 메모/요청사항 입력
  CONFIRMING = 'CONFIRMING',                         // 최종 확인 중
  CHECKOUT_READY = 'CHECKOUT_READY',                 // 결제 준비 완료
}

// 백엔드 UiAction과 동기화
export enum UiAction {
  NONE = 'NONE',
  SHOW_CONFIRM_MODAL = 'SHOW_CONFIRM_MODAL',
  SHOW_CANCEL_CONFIRM = 'SHOW_CANCEL_CONFIRM',
  UPDATE_ORDER_LIST = 'UPDATE_ORDER_LIST',
  PROCEED_TO_CHECKOUT = 'PROCEED_TO_CHECKOUT',       // 결제 진행 → Cart API 호출 후 주문내역으로 리디렉션
}

// 음성 주문 채팅 응답 DTO
export interface VoiceChatResponseDto {
  userMessage: string;
  assistantMessage: string;
  flowState: OrderFlowState;
  uiAction: UiAction;
  currentOrder: VoiceOrderItemDto[];
  totalPrice: number;
  selectedAddress: string | null;
  memo: string | null;
}

// 음성 주문 메뉴 커스터마이징 (개별 상품의 메뉴 구성 변경)
export interface VoiceMenuCustomization {
  menuItemId: string;
  menuItemName: string;
  defaultQuantity: number;  // 기본 수량
  currentQuantity: number;  // 현재 수량 (사용자가 +/- 한 결과)
  unitPrice: number;        // 단가
}

// 음성 주문 추가 메뉴 아이템 (샐러드, 와인 등)
export interface VoiceAdditionalMenuItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// 음성 주문 개별 상품 DTO (quantity=1인 개별 아이템)
export interface VoiceOrderProductDto {
  productIndex: number;     // 프론트엔드 고유 인덱스
  dinnerId: string;
  dinnerName: string;
  servingStyleId: string | null;
  servingStyleName: string | null;
  basePrice: number;
  stylePrice: number;
  menuCustomizations: VoiceMenuCustomization[];  // 메뉴 구성 커스터마이징
  customizationPriceDiff: number;  // 커스터마이징으로 인한 가격 변동
  totalPrice: number;       // basePrice + stylePrice + customizationPriceDiff
}

// 음성 주문 아이템 DTO (레거시 호환용 - quantity 포함)
export interface VoiceOrderItemDto {
  dinnerId: string;
  dinnerName: string;
  servingStyleId: string | null;
  servingStyleName: string | null;
  quantity: number;
  basePrice: number;
  stylePrice: number;
  totalPrice: number;
}
