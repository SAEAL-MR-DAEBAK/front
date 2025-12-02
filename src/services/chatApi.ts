import { ChatRequest, ChatResponse, ChatMessage, OrderItem, LoginRequest, LoginResponse } from '../types';

const API_BASE_URL = 'http://localhost:8080/api';

// 토큰 키 상수
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

/**
 * 토큰 관리 유틸리티
 * localStorage를 단일 진실 소스로 사용
 */
const TokenManager = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    // JWT 만료 체크 (선택적)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // 초 → 밀리초
      return Date.now() < exp;
    } catch {
      // 파싱 실패 시 토큰이 있으면 true
      return true;
    }
  }
};

export class ChatApi {
  private getAuthHeaders(): HeadersInit {
    const token = TokenManager.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // 로그인
  async login(username: string, password: string): Promise<LoginResponse> {
    const request: LoginRequest = { username, password };

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`로그인 실패: ${response.status}`);
    }

    const data: LoginResponse = await response.json();
    TokenManager.setTokens(data.accessToken, data.refreshToken);

    return data;
  }

  // 로그아웃
  logout(): void {
    TokenManager.clearTokens();
  }

  // 로그인 여부 확인
  isLoggedIn(): boolean {
    return TokenManager.isAuthenticated();
  }

  // 텍스트 메시지 전송 (Stateless)
  async sendMessage(
    message: string,
    conversationHistory: ChatMessage[],
    currentOrder: OrderItem[]
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      message,
      conversationHistory,
      currentOrder,
    };

    const response = await fetch(`${API_BASE_URL}/voice-order/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (!response.ok) {
      throw new Error(`API 에러: ${response.status}`);
    }

    return response.json();
  }

  // 음성 메시지 전송 (Stateless)
  async sendVoice(
    audioBase64: string,
    conversationHistory: ChatMessage[],
    currentOrder: OrderItem[],
    audioFormat: string = 'webm'
  ): Promise<ChatResponse> {
    const request: ChatRequest = {
      audioBase64,
      audioFormat,
      conversationHistory,
      currentOrder,
    };

    const response = await fetch(`${API_BASE_URL}/voice-order/chat`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
    }

    if (!response.ok) {
      throw new Error(`API 에러: ${response.status}`);
    }

    return response.json();
  }

  // 헬스체크
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL.replace('/api', '')}/`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// 싱글톤 인스턴스
export const chatApi = new ChatApi();
