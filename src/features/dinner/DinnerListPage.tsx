import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// ============================================
// Import
// ============================================
import apiClient from '../../lib/axios';
import { DinnerResponseDto } from '../../types/api';
import { DinnerCard } from './components/DinnerCard';

// ============================================
// DinnerListPage 컴포넌트
// ============================================
// 역할: 메인 페이지 - 디너 목록을 API에서 조회하여 표시
// API: GET /api/dinners/getAllDinners
// ============================================

export const DinnerListPage: React.FC = () => {
  const navigate = useNavigate();

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [dinners, setDinners] = useState<DinnerResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------
  // API 호출: 디너 목록 조회
  // ----------------------------------------
  useEffect(() => {
    const fetchDinners = async () => {
      try {
        setLoading(true);
        setError(null);

        // GET /api/dinners/getAllDinners
        const response = await apiClient.get<DinnerResponseDto[]>('/dinners/getAllDinners');

        // active: true인 디너만 필터링하여 표시
        const activeDinners = response.data.filter((dinner) => dinner.active);
        setDinners(activeDinners);

      } catch (err) {
        console.error('디너 목록 로딩 실패:', err);
        setError('디너 목록을 불러오는데 실패했습니다. 다시 시도해주세요.');
      } finally {
        setLoading(false);
      }
    };

    fetchDinners();
  }, []);

  // ----------------------------------------
  // 렌더링: 로딩 상태
  // ----------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">메뉴를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 에러 상태
  // ----------------------------------------
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-red-600 text-lg mb-4 text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 메인 컨텐츠
  // ----------------------------------------
  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* 헤더 섹션 */}
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mr. DAEBAK</h1>
        <p className="text-gray-600">특별한 디너를 주문하세요</p>
      </header>

      {/* 디너 카드 그리드 */}
      {dinners.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {dinners.map((dinner) => (
            <DinnerCard
              key={dinner.id}
              dinner={dinner}
              onClick={() => navigate('/')}
            />
          ))}
        </div>
      ) : (
        // 디너가 없는 경우
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">등록된 디너가 없습니다.</p>
        </div>
      )}
    </div>
  );
};
