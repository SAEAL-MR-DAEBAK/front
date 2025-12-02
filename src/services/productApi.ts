const API_BASE_URL = 'http://localhost:8080/api';

// Product 생성 요청
export interface CreateProductRequest {
  dinnerId: string;
  servingStyleId: string;
  quantity: number;
  memo?: string;
  productName?: string;
  address: string;  // 필수 필드
}

// Product 응답
export interface ProductResponse {
  id: string;
  dinnerId: string;
  dinnerName: string;
  servingStyleId: string;
  servingStyleName: string;
  productName: string;
  totalPrice: number;
  quantity: number;
  memo?: string;
}

// Cart 아이템 요청
export interface CartItemRequest {
  productId: string;
  quantity: number;
}

// Cart 생성 요청
export interface CreateCartRequest {
  items: CartItemRequest[];
  deliveryAddress?: string;
  deliveryMethod?: 'Delivery' | 'Pickup';
  memo?: string;
}

// Cart 응답
export interface CartResponse {
  id: string;
  userId: string;
  products: ProductResponse[];
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  grandTotal: number;
  status: string;
  createdAt: string;
}

class ProductApi {
  private getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Product 생성 (Dinner + ServingStyle + quantity → Product)
  async createProduct(request: CreateProductRequest): Promise<ProductResponse> {
    const response = await fetch(`${API_BASE_URL}/products/createProduct`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (response.status === 401) {
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (!response.ok) {
      throw new Error(`Product 생성 실패: ${response.status}`);
    }

    return response.json();
  }

  // Cart 생성 (Product들을 장바구니에 담기)
  async createCart(request: CreateCartRequest): Promise<CartResponse> {
    const response = await fetch(`${API_BASE_URL}/carts/createCart`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (response.status === 401) {
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (!response.ok) {
      throw new Error(`Cart 생성 실패: ${response.status}`);
    }

    return response.json();
  }

  // 현재 사용자의 Cart 목록 조회
  async getMyCarts(): Promise<CartResponse[]> {
    const response = await fetch(`${API_BASE_URL}/carts`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (!response.ok) {
      throw new Error(`Cart 조회 실패: ${response.status}`);
    }

    return response.json();
  }
}

// 싱글톤 인스턴스
export const productApi = new ProductApi();
