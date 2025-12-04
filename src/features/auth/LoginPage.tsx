import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// ============================================
// Import
// ============================================
import apiClient from '../../lib/axios';
import { useAuthStore } from '../../stores/useAuthStore';
import { LoginResponseDto } from '../../types/api';

// ============================================
// LoginPage 컴포넌트
// ============================================
// 역할: 사용자 로그인 처리
// API: POST /api/auth/login
// ============================================

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth store에서 로그인 함수 가져오기
  const login = useAuthStore((state) => state.login);

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 로그인 후 리다이렉트할 경로 (ProtectedRoute에서 전달)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  // ----------------------------------------
  // 이벤트 핸들러: 로그인
  // ----------------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // POST /api/auth/login
      const response = await apiClient.post<LoginResponseDto>('/auth/login', {
        username,
        password,
      });

      const { accessToken, user } = response.data;

      // Auth store에 로그인 정보 저장
      login(accessToken, user);

      // 관리자 계정이면 관리자 페이지로 리디렉션
      if (user.authority === 'ROLE_ADMIN') {
        navigate('/admin/orders', { replace: true });
      } else {
        // 원래 가려던 페이지로 이동 (없으면 메인)
        navigate(from, { replace: true });
      }

    } catch (err) {
      console.error('로그인 실패:', err);
      setError('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------
  // 렌더링
  // ----------------------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        {/* 헤더 */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Mr. Daebak
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            로그인하여 특별한 디너를 주문하세요
          </p>
        </div>

        {/* 로그인 폼 */}
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            {/* 아이디 입력 */}
            <div>
              <label htmlFor="username" className="sr-only">아이디</label>
              <input
                id="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="아이디"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="sr-only">비밀번호</label>
              <input
                id="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {/* 로그인 버튼 */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          {/* 회원가입 링크 */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-medium text-green-600 hover:text-green-500 ml-1 underline"
                disabled={isLoading}
              >
                회원가입
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
