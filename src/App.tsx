import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';

// ============================================
// 페이지 컴포넌트 Import
// ============================================
import { OrderFlowPage } from './features/order/OrderFlowPage';
import { DinnerListPage } from './features/dinner/DinnerListPage';
import { DinnerDetailPage } from './features/dinner/DinnerDetailPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { OrderHistoryPage } from './features/order/components/OrderHistoryPage';
import { MyPage } from './features/mypage/MyPage';
import { AdminOrderPage } from './features/admin/AdminOrderPage';

// ============================================
// 공통 컴포넌트 Import
// ============================================
import { AIChatDrawer } from './components/AIChatDrawer';
import { ProtectedRoute } from './components/ProtectedRoute';

// ============================================
// 상태 관리 Import
// ============================================
import { useUIStore } from './stores/useUIStore';
import { useAuthStore } from './stores/useAuthStore';

// ============================================
// NavigationBar 컴포넌트
// ============================================
// 역할: 로그인 상태에 따라 다른 UI 표시
// ============================================
const NavigationBar: React.FC = () => {
  const navigate = useNavigate();

  // Store에서 상태 및 액션 가져오기
  const { toggleAIChat } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();

  // ----------------------------------------
  // 이벤트 핸들러: 로그아웃
  // ----------------------------------------
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

      {/* 우측 버튼 영역 */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          // ----------------------------------------
          // 관리자 계정: 로그아웃만 표시
          // ----------------------------------------
          user?.authority === 'ROLE_ADMIN' ? (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-600 hover:text-red-600"
            >
              로그아웃
            </button>
          ) : (
            // ----------------------------------------
            // 일반 사용자: 사용자명(마이페이지), 장바구니, AI주문, 로그아웃
            // ----------------------------------------
            <>
              {/* 사용자명 (클릭 시 마이페이지) */}
              {(user?.displayName || user?.username) && (
                <Link
                  to="/mypage"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors hidden sm:flex"
                >
                  <span className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {(user.displayName || user.username || '').charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {user.displayName || user.username}님
                  </span>
                </Link>
              )}


              {/* 주문 내역 버튼 */}
              <Link
                to="/orders"
                className="text-sm font-medium text-gray-600 hover:text-green-600 hidden sm:block"
              >
                주문 내역
              </Link>

              {/* AI 주문하기 버튼 */}
              <button
                onClick={toggleAIChat}
                className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full font-bold hover:bg-green-200 transition-colors shadow-sm"
              >
                <span>🤖</span>
                <span className="hidden xs:inline">AI 주문</span>
              </button>

              {/* 로그아웃 버튼 */}
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-600 hover:text-red-600 hidden sm:block"
              >
                로그아웃
              </button>
            </>
          )
        ) : (
          // ----------------------------------------
          // 비로그인 상태: 로그인 버튼만
          // ----------------------------------------
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

// ============================================
// App 컴포넌트 (메인)
// ============================================
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 relative">
        {/* ============================================ */}
        {/* 1. 상단 네비게이션 바                        */}
        {/* ============================================ */}
        <NavigationBar />

        {/* ============================================ */}
        {/* 2. 메인 컨텐츠 영역 (라우팅)                */}
        {/* ============================================ */}
        <Routes>
          {/* ------------------------------------------ */}
          {/* 공개 라우트 (로그인 불필요)                 */}
          {/* ------------------------------------------ */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ------------------------------------------ */}
          {/* 보호된 라우트 (로그인 필요)                 */}
          {/* ------------------------------------------ */}
          {/* 메인 페이지 (단계별 주문 플로우) */}
          <Route path="/" element={
            <ProtectedRoute>
              <OrderFlowPage />
            </ProtectedRoute>
          } />

          {/* 기존 디너 목록 페이지 (별도 접근용) */}
          <Route path="/menu" element={
            <ProtectedRoute>
              <DinnerListPage />
            </ProtectedRoute>
          } />

          {/* 디너 상세 페이지 */}
          <Route path="/dinner/:dinnerId" element={
            <ProtectedRoute>
              <DinnerDetailPage />
            </ProtectedRoute>
          } />


          {/* 주문 내역 */}
          <Route path="/orders" element={
            <ProtectedRoute>
              <OrderHistoryPage />
            </ProtectedRoute>
          } />

          {/* 마이페이지 (회원정보 수정, 결제수단 관리) */}
          <Route path="/mypage" element={
            <ProtectedRoute>
              <MyPage />
            </ProtectedRoute>
          } />

          {/* 관리자 페이지 (관리자만 접근 가능) */}
          <Route path="/admin/orders" element={
            <ProtectedRoute allowAdmin={true}>
              <AdminOrderPage />
            </ProtectedRoute>
          } />

          {/* ------------------------------------------ */}
          {/* 404 처리                                   */}
          {/* ------------------------------------------ */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* ============================================ */}
        {/* 3. AI 사이드바 (오버레이)                    */}
        {/* ============================================ */}
        <AIChatDrawer />
      </div>
    </BrowserRouter>
  );
};

export default App;
