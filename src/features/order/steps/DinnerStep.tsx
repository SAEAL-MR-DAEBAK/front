import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { DinnerResponseDto } from '../../../types/api';

// ============================================
// DinnerStep 컴포넌트
// ============================================
// 역할: 2단계 - 디너 종류 선택
// API: GET /api/dinners/getAllDinners
// ============================================

// 디너별 이모지 매핑
const getDinnerEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('valentine')) return '💝';
  if (lowerName.includes('french')) return '🥖';
  if (lowerName.includes('english')) return '🍳';
  if (lowerName.includes('champagne')) return '🍾';
  return '🍽️';
};

export const DinnerStep: React.FC = () => {
  const { 
    selectedDinner, 
    createdProduct,
    setDinner, 
    setStyle,
    setCreatedProduct,
    setMenuCustomizations,
    setAdditionalMenuItems,
    nextStep, 
    prevStep 
  } = useOrderFlowStore();
  
  // 현재 선택된 디너의 가격 계산
  const currentPrice = selectedDinner ? selectedDinner.basePrice : 0;

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [dinners, setDinners] = useState<DinnerResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------------------
  // API 호출: 디너 목록 조회
  // ----------------------------------------
  useEffect(() => {
    const fetchDinners = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<DinnerResponseDto[]>('/dinners/getAllDinners');
        const activeDinners = response.data.filter((d) => d.active);
        setDinners(activeDinners);
      } catch (err) {
        console.error('디너 목록 로딩 실패:', err);
        setError('디너 목록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDinners();
  }, []);

  // ----------------------------------------
  // 이벤트 핸들러
  // ----------------------------------------
  const handleSelectDinner = async (dinner: DinnerResponseDto) => {
    // 디너가 변경되면 관련된 모든 상태 초기화 및 이전 Product 삭제
    if (selectedDinner && selectedDinner.id !== dinner.id) {
      // 다른 디너를 선택한 경우 이전 Product 삭제
      if (createdProduct) {
        try {
          await apiClient.delete(`/products/${createdProduct.id}`);
        } catch (err: any) {
          // 삭제 실패해도 계속 진행 (이미 삭제되었거나 없는 경우)
          // 404 에러는 무시 (이미 삭제된 경우)
          if (err.response?.status !== 404) {
            console.warn('이전 Product 삭제 실패:', err);
          }
        }
      }
      // 상태 초기화
      setStyle(null);
      setCreatedProduct(null);
      setMenuCustomizations([]);
      setAdditionalMenuItems([]);
    }
    setDinner(dinner);
  };

  const handleNext = () => {
    if (!selectedDinner) {
      alert('디너를 선택해주세요.');
      return;
    }
    nextStep();
  };

  // ----------------------------------------
  // 렌더링: 로딩
  // ----------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">메뉴를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 에러
  // ----------------------------------------
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-green-600 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 메인
  // ----------------------------------------
  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          어떤 <span className="text-green-600">디너</span>를 원하시나요?
        </h2>
        <p className="text-gray-500">특별한 만찬을 선택해주세요</p>
      </div>

      {/* 디너 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        {dinners.map((dinner) => (
          <button
            key={dinner.id}
            onClick={() => handleSelectDinner(dinner)}
            className={`text-left p-6 rounded-2xl border-2 transition-all transform hover:scale-[1.02] ${
              selectedDinner?.id === dinner.id
                ? 'border-green-600 bg-green-50 shadow-lg'
                : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
            }`}
          >
            {/* 이모지 및 제목 */}
            <div className="flex items-start gap-4">
              <div className="text-5xl">{getDinnerEmoji(dinner.dinnerName)}</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                  {dinner.dinnerName}
                </h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                  {dinner.description}
                </p>
                <p className="text-lg font-bold text-green-600">
                  ₩{dinner.basePrice.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 선택 표시 */}
            {selectedDinner?.id === dinner.id && (
              <div className="mt-4 flex items-center justify-center">
                <span className="bg-green-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  ✓ 선택됨
                </span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 디너가 없는 경우 */}
      {dinners.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">등록된 디너가 없습니다.</p>
        </div>
      )}

      {/* 현재 가격 표시 */}
      {selectedDinner && (
        <div className="bg-green-50 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-gray-500 mb-1">현재 선택된 가격</p>
          <p className="text-2xl font-bold text-green-600">
            ₩{currentPrice.toLocaleString()}
          </p>
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="flex gap-4">
        <button
          onClick={prevStep}
          className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
        >
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedDinner}
          className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all ${
            selectedDinner
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
};
