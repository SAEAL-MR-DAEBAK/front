import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { ServingStyleResponseDto, CreateProductRequest, ProductResponseDto } from '../../../types/api';

// ============================================
// StyleStep 컴포넌트
// ============================================
// 역할: 3단계 - 서빙 스타일 선택
// API: GET /api/serving-styles/getAllServingStyles
// ============================================

// 스타일별 이모지 매핑
const getStyleEmoji = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('simple')) return '🥡';
  if (lowerName.includes('grand')) return '🍽️';
  if (lowerName.includes('deluxe')) return '✨';
  return '🍴';
};

export const StyleStep: React.FC = () => {
  const { 
    selectedDinner, 
    selectedStyle, 
    selectedAddress,
    createdProduct,
    quantity,
    memo,
    setStyle, 
    setCreatedProduct,
    nextStep, 
    prevStep 
  } = useOrderFlowStore();
  
  // 현재 가격 계산 (디너 + 서빙스타일)
  const currentPrice = selectedDinner
    ? (selectedDinner.basePrice + (selectedStyle?.extraPrice || 0)) * quantity
    : 0;

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [styles, setStyles] = useState<ServingStyleResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // 샴페인 축제 디너는 Grand 또는 Deluxe 스타일만 선택 가능
  const isChampagneDinner = selectedDinner?.dinnerName
    ?.toLowerCase()
    .includes('champagne');

  // ----------------------------------------
  // API 호출: 서빙 스타일 목록 조회
  // ----------------------------------------
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<ServingStyleResponseDto[]>(
          '/serving-styles/getAllServingStyles'
        );
        const activeStyles = response.data.filter((s) => s.active);
        setStyles(activeStyles);
      } catch (err) {
        console.error('서빙 스타일 로딩 실패:', err);
        setError('서빙 스타일을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStyles();
  }, []);

  // ----------------------------------------
  // 이벤트 핸들러
  // ----------------------------------------
  const handleNext = async () => {
    if (!selectedStyle) {
      alert('서빙 스타일을 선택해주세요.');
      return;
    }

    if (!selectedDinner) {
      alert('디너를 선택해주세요.');
      return;
    }

    if (!selectedAddress) {
      alert('배달 주소를 선택해주세요.');
      return;
    }

    try {
      setIsCreatingProduct(true);
      setError(null);

      // 이전 Product가 있고, 서빙스타일이 변경된 경우 이전 Product 삭제
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

      // createProduct API 호출
      const request: CreateProductRequest = {
        dinnerId: selectedDinner.id,
        servingStyleId: selectedStyle.id,
        quantity: quantity,
        address: selectedAddress,
        memo: memo || undefined,
      };

      const response = await apiClient.post<ProductResponseDto>(
        '/products/createProduct',
        request
      );

      // 생성된 product를 store에 저장
      setCreatedProduct(response.data);

      // 다음 단계로 이동
      nextStep();
    } catch (err: any) {
      console.error('상품 생성 실패:', err);
      const errorMessage = err.response?.data?.message || '상품 생성에 실패했습니다. 다시 시도해주세요.';
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsCreatingProduct(false);
    }
  };

  // ----------------------------------------
  // 렌더링: 로딩
  // ----------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-500">스타일 옵션을 불러오는 중...</p>
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
    <div className="max-w-3xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          <span className="text-green-600">서빙 스타일</span>을 선택하세요
        </h2>
        <p className="text-gray-500">분위기에 맞는 스타일을 골라주세요</p>
      </div>

      {/* 선택된 디너 표시 */}
      {selectedDinner && (
        <div className="bg-green-50 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <p className="text-sm text-green-600">선택된 디너</p>
            <p className="font-bold">{selectedDinner.dinnerName}</p>
          </div>
        </div>
      )}

      {/* 스타일 목록 */}
      <div className="space-y-4 mb-8">
        {styles.map((style) => {
          const styleNameLower = style.styleName.toLowerCase();
          // 샴페인 축제 디너는 Grand 또는 Deluxe만 선택 가능
          const isDisabled = isChampagneDinner && 
            !(styleNameLower.includes('grand') || styleNameLower.includes('deluxe'));

          return (
            <button
              key={style.id}
              onClick={() => !isDisabled && setStyle(style)}
              disabled={isDisabled}
              className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                isDisabled
                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                  : selectedStyle?.id === style.id
                  ? 'border-green-600 bg-green-50 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-green-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <span className="text-4xl flex-shrink-0">{getStyleEmoji(style.styleName)}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900">
                      {style.styleName}
                      {isDisabled && (
                        <span className="ml-2 text-sm text-red-500">(선택 불가)</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">{style.description}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-green-600 whitespace-nowrap">
                    {style.extraPrice > 0
                      ? `+₩${style.extraPrice.toLocaleString()}`
                      : '무료'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 스타일이 없는 경우 */}
      {styles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">선택 가능한 스타일이 없습니다.</p>
        </div>
      )}

      {/* 현재 가격 표시 */}
      {selectedDinner && (
        <div className="bg-green-50 rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-gray-500 mb-1">현재 선택된 가격</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">
              디너: ₩{selectedDinner.basePrice.toLocaleString()}
              {selectedStyle && (
                <span> + 서빙스타일: ₩{selectedStyle.extraPrice.toLocaleString()}</span>
              )}
            </p>
            <p className="text-2xl font-bold text-green-600">
              총 ₩{currentPrice.toLocaleString()}
            </p>
            {quantity > 1 && (
              <p className="text-xs text-gray-500">
                (₩{((selectedDinner.basePrice + (selectedStyle?.extraPrice || 0))).toLocaleString()} × {quantity}개)
              </p>
            )}
          </div>
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="flex gap-4">
        <button
          onClick={() => {
            // 서빙스타일과 product가 초기화됨을 알리는 모달
            if (selectedStyle || createdProduct) {
              const confirmed = window.confirm(
                '이전 단계로 돌아가면 선택한 서빙스타일과 메뉴 구성이 초기화됩니다. 계속하시겠습니까?'
              );
              if (confirmed) {
                setStyle(null);
                setCreatedProduct(null);
                prevStep();
              }
            } else {
              prevStep();
            }
          }}
          className="flex-1 py-4 rounded-xl text-lg font-bold border-2 border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
        >
          이전
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedStyle || isCreatingProduct}
          className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all ${
            selectedStyle && !isCreatingProduct
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isCreatingProduct ? '상품 생성 중...' : '다음 단계로'}
        </button>
      </div>
    </div>
  );
};
