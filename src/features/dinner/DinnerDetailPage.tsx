import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// ============================================
// Import
// ============================================
import apiClient from '../../lib/axios';
import {
  DinnerResponseDto,
  ServingStyleResponseDto,
  CreateProductRequest,
  ProductResponseDto
} from '../../types/api';

// ============================================
// DinnerDetailPage 컴포넌트
// ============================================
// 역할: 디너 상세 페이지 - 서빙 스타일 선택 및 주문하기
// API:
//   - GET /api/dinners/getAllDinners (디너 정보)
//   - GET /api/serving-styles/getAllServingStyles (서빙 스타일 목록)
//   - POST /api/products/createProduct (상품 생성)
// ============================================

export const DinnerDetailPage: React.FC = () => {
  const { dinnerId } = useParams<{ dinnerId: string }>();
  const navigate = useNavigate();


  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  // 데이터 상태
  const [dinner, setDinner] = useState<DinnerResponseDto | null>(null);
  const [servingStyles, setServingStyles] = useState<ServingStyleResponseDto[]>([]);

  // 로딩/에러 상태
  const [loading, setLoading] = useState<boolean>(true);
  const [stylesLoading, setStylesLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [stylesError, setStylesError] = useState<string | null>(null);

  // 사용자 선택 상태
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [memo, setMemo] = useState<string>('');

  // ----------------------------------------
  // API 호출: 디너 정보 조회
  // ----------------------------------------
  useEffect(() => {
    const fetchDinner = async () => {
      if (!dinnerId) return;

      try {
        setLoading(true);
        setError(null);

        // GET /api/dinners/getAllDinners 후 ID로 필터링
        const response = await apiClient.get<DinnerResponseDto[]>('/dinners/getAllDinners');
        const foundDinner = response.data.find((d) => d.id === dinnerId);

        if (foundDinner) {
          setDinner(foundDinner);
        } else {
          setError('해당 메뉴를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('디너 정보 로딩 실패:', err);
        setError('메뉴 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchDinner();
  }, [dinnerId]);

  // ----------------------------------------
  // API 호출: 서빙 스타일 목록 조회
  // ----------------------------------------
  useEffect(() => {
    const fetchServingStyles = async () => {
      try {
        setStylesLoading(true);
        setStylesError(null);

        // GET /api/serving-styles/getAllServingStyles
        const response = await apiClient.get<ServingStyleResponseDto[]>('/serving-styles/getAllServingStyles');

        // active: true인 스타일만 필터링
        const activeStyles = response.data.filter((style) => style.active);
        setServingStyles(activeStyles);

      } catch (err) {
        console.error('서빙 스타일 로딩 실패:', err);
        setStylesError('서빙 스타일을 불러오는데 실패했습니다.');
      } finally {
        setStylesLoading(false);
      }
    };

    fetchServingStyles();
  }, []);

  // ----------------------------------------
  // 계산 로직
  // ----------------------------------------
  // 선택된 서빙 스타일 정보
  const selectedStyle = servingStyles.find((s) => s.id === selectedStyleId);
  const styleExtraPrice = selectedStyle?.extraPrice || 0;

  // 총 가격 계산: (기본가 + 스타일 추가비용) * 수량
  const totalPrice = dinner ? (dinner.basePrice + styleExtraPrice) * quantity : 0;

  // 샴페인 디너 예외 처리 (Simple 스타일 선택 불가)
  const isChampagneDinner = dinner?.dinnerName?.toLowerCase().includes('champagne');

  // ----------------------------------------
  // 이벤트 핸들러: 주문하기 (주문 플로우로 이동)
  // ----------------------------------------
  const handleOrder = () => {
    // 주문 플로우 페이지로 이동 (주문 플로우에서 디너와 스타일을 선택하도록 함)
    navigate('/');
  };

  // ----------------------------------------
  // 렌더링: 로딩 상태
  // ----------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">메뉴 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 에러 상태
  // ----------------------------------------
  if (error || !dinner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-red-600 text-lg mb-4 text-center">{error || '메뉴를 찾을 수 없습니다.'}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          메뉴 목록으로 돌아가기
        </button>
      </div>
    );
  }

  // ----------------------------------------
  // 렌더링: 메인 컨텐츠
  // ----------------------------------------
  return (
    <div className="max-w-2xl mx-auto p-4 pb-32">
      {/* 뒤로가기 버튼 */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        뒤로가기
      </button>

      {/* 헤더 이미지 */}
      <div className="h-60 bg-gray-200 rounded-xl mb-6 overflow-hidden flex items-center justify-center">
        {dinner.imageUrl ? (
          <img src={dinner.imageUrl} alt={dinner.dinnerName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-6xl">🍽️</span>
        )}
      </div>

      {/* 디너 정보 */}
      <h1 className="text-3xl font-bold mb-2">{dinner.dinnerName}</h1>
      <p className="text-gray-600 mb-2">{dinner.description}</p>
      <p className="text-xl font-semibold text-green-600 mb-6">
        기본가 ₩{dinner.basePrice.toLocaleString()}
      </p>

      <hr className="border-gray-200 my-6" />

      {/* ---------------------------------------- */}
      {/* 서빙 스타일 선택 섹션                     */}
      {/* ---------------------------------------- */}
      <h2 className="text-xl font-bold mb-4">서빙 스타일 선택 (필수)</h2>

      {stylesLoading ? (
        <div className="text-center py-4">
          <p className="text-gray-500">스타일 옵션을 불러오는 중...</p>
        </div>
      ) : stylesError ? (
        <div className="text-center py-4">
          <p className="text-red-500">{stylesError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-green-600 hover:underline text-sm"
          >
            다시 시도
          </button>
        </div>
      ) : servingStyles.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">선택 가능한 스타일이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servingStyles.map((style) => {
            // 샴페인 디너일 경우 Simple 스타일 비활성화
            const isDisabled = isChampagneDinner && style.styleName === 'Simple';

            return (
              <label
                key={style.id}
                className={`flex justify-between items-center p-4 border rounded-lg transition-colors cursor-pointer ${
                  isDisabled
                    ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                    : selectedStyleId === style.id
                    ? 'bg-green-50 border-green-600 ring-1 ring-green-600'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="servingStyle"
                    value={style.id}
                    checked={selectedStyleId === style.id}
                    onChange={(e) => setSelectedStyleId(e.target.value)}
                    disabled={isDisabled}
                    className="w-4 h-4 text-green-600 focus:ring-green-500"
                  />
                  <div className="ml-3">
                    <span className="block font-medium text-gray-900">
                      {style.styleName}
                      {isDisabled && <span className="text-xs text-red-500 ml-2">(선택 불가)</span>}
                    </span>
                    <span className="block text-sm text-gray-500">{style.description}</span>
                  </div>
                </div>
                <span className="text-gray-900 font-medium">
                  {style.extraPrice > 0 ? `+ ₩${style.extraPrice.toLocaleString()}` : '무료'}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------- */}
      {/* 요청사항 (Memo) 섹션                      */}
      {/* ---------------------------------------- */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">특별 요청사항</h2>
        <textarea
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          rows={3}
          placeholder="예: 샴페인 2병으로 변경해주세요. (추가 비용 발생 가능)"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      {/* ---------------------------------------- */}
      {/* 하단 고정 주문 버튼                       */}
      {/* ---------------------------------------- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* 수량 조절 버튼 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-xl font-bold transition-colors"
              aria-label="수량 감소"
            >
              -
            </button>
            <span className="text-lg font-medium w-8 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 text-xl font-bold transition-colors"
              aria-label="수량 증가"
            >
              +
            </button>
          </div>

          {/* 주문하기 버튼 */}
          <button
            onClick={handleOrder}
            disabled={!selectedStyleId || stylesLoading || !!stylesError}
            className={`font-bold py-3 px-8 rounded-lg transition-colors flex-1 ml-6 ${
              selectedStyleId && !stylesLoading && !stylesError
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            주문하기 • ₩{totalPrice.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
};
