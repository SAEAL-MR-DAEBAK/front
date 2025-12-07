import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';

import { OrderFlowPage } from './features/order/OrderFlowPage';
import { DinnerListPage } from './features/dinner/DinnerListPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { OrderHistoryPage } from './features/order/components/OrderHistoryPage';
import { MyPage } from './features/mypage/MyPage';
import { AdminOrderPage } from './features/admin/AdminOrderPage';
import { AIChatDrawer } from './components/AIChatDrawer';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useUIStore } from './stores/useUIStore';
import { useAuthStore } from './stores/useAuthStore';

const NavigationBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleAIChat, isAIChatOpen } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-30">
      {/* 로고 (클릭 시 홈으로, 관리자는 관리자 페이지로) */}
      <Link 
        to={user?.authority === 'ROLE_ADMIN' ? '/admin/orders' : '/'} 
        className="text-xl font-extrabold text-green-700 flex items-center gap-2"
      >
        <span>🍽️</span> Mr. DAEBAK
      </Link>

      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          user?.authority === 'ROLE_ADMIN' ? (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-red-600"
            >
              로그아웃
            </button>
          ) : (
            <>
              {/* 프로필 관리 버튼 */}
              <Link
                to="/mypage"
                className={`text-sm font-medium hidden sm:block ${
                  location.pathname === '/mypage' 
                    ? 'text-gray-900 font-semibold' 
                    : 'text-gray-400 hover:text-green-600'
                }`}
              >
                프로필 관리
              </Link>

              {/* 주문 내역 버튼 */}
              <Link
                to="/orders"
                className={`text-sm font-medium hidden sm:block ${
                  location.pathname === '/orders' 
                    ? 'text-gray-900 font-semibold' 
                    : 'text-gray-400 hover:text-green-600'
                }`}
              >
                주문 내역
              </Link>

              {/* AI 주문하기 버튼 */}
              <button
                onClick={toggleAIChat}
                className={`text-sm font-medium hidden sm:block ${
                  isAIChatOpen
                    ? 'text-gray-900 font-semibold' 
                    : 'text-gray-400 hover:text-green-600'
                }`}
              >
                Mr. DAEBAK AI
              </button>

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-400 hover:text-red-600 hidden sm:block"
              >
                로그아웃
              </button>
            </>
          )
        ) : (
          <Link
            to="/login"
            className="text-sm font-medium text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition-colors"
          >
            로그인
          </Link>
        )}
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  const { validateToken } = useAuthStore();

  // 앱 초기화 시 토큰 유효성 검증
  useEffect(() => {
    validateToken();
  }, [validateToken]); // 앱 초기화 시 한 번만 실행

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 relative">
        <NavigationBar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={
            <ProtectedRoute>
              <OrderFlowPage />
            </ProtectedRoute>
          } />
          <Route path="/menu" element={
            <ProtectedRoute>
              <DinnerListPage />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrderHistoryPage />
            </ProtectedRoute>
          } />
          <Route path="/mypage" element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute allowAdmin={true}>
              <AdminOrderPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <AIChatDrawer />
      </div>
    </BrowserRouter>
  );
};

export default App;
