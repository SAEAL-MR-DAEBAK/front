import React, { useState, useEffect } from 'react';
import apiClient from '../../../lib/axios';
import { useOrderFlowStore } from '../../../stores/useOrderFlowStore';
import { useAuthStore } from '../../../stores/useAuthStore';

// ============================================
// AddressStep 컴포넌트
// ============================================
// 역할: 1단계 - 배달 주소 입력/선택
// API (예정):
//   - GET /api/users/addresses - 저장된 주소 목록
//   - POST /api/users/addresses - 새 주소 추가
// ============================================

export const AddressStep: React.FC = () => {
  const { user } = useAuthStore();
  const { selectedAddress, setAddress, nextStep, prevStep } = useOrderFlowStore();

  // ----------------------------------------
  // 상태 관리
  // ----------------------------------------
  const [inputAddress, setInputAddress] = useState(selectedAddress);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ----------------------------------------
  // 저장된 주소 목록 불러오기
  // ----------------------------------------
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        const response = await apiClient.get<string[]>('/users/addresses');
        setSavedAddresses(response.data);

        // 첫 번째 주소가 있고 입력된 주소가 없으면 첫 번째 주소로 설정
        if (response.data.length > 0 && !inputAddress) {
          setInputAddress(response.data[0]);
        }
      } catch (err) {
        console.error('주소 목록 로딩 실패:', err);
      }
    };

    fetchAddresses();
  }, []);

  // ----------------------------------------
  // 이벤트 핸들러
  // ----------------------------------------
  const handleSelectAddress = (address: string) => {
    setInputAddress(address);
  };

  const handleNext = async () => {
    if (!inputAddress.trim()) {
      alert('배달 주소를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // 새 주소인 경우 저장
      const isNewAddress = !savedAddresses.includes(inputAddress.trim());
      if (isNewAddress) {
        try {
          const request = {
            address: inputAddress.trim(),
          };
          await apiClient.post('/users/addresses', request);
        } catch (err) {
          // 주소 저장 실패해도 계속 진행 (이미 입력한 주소로 주문 진행)
          console.warn('주소 저장 실패 (계속 진행):', err);
        }
      }

      setAddress(inputAddress.trim());
      nextStep();
    } catch (err) {
      console.error('주소 처리 실패:', err);
      alert('주소 처리에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------
  // 렌더링
  // ----------------------------------------
  return (
    <div className="max-w-2xl mx-auto">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          "어디로 <span className="text-green-600">배달</span>해 드릴까요?"
        </h2>
        <p className="text-gray-500">배달받으실 동 이름으로 검색해주세요</p>
      </div>

      {/* 주소 입력 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-500 text-xl">📍</span>
          </div>
          <input
            type="text"
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            placeholder="서울특별시 동대문구 서울시립대로 163 정보기술관 1층"
            className="flex-1 text-lg border-none outline-none placeholder-gray-400"
          />
          {inputAddress && (
            <button
              onClick={() => setInputAddress('')}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 저장된 주소 목록 */}
      {savedAddresses.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="font-bold text-gray-700 mb-4">저장된 주소</h3>
          <div className="space-y-3">
            {savedAddresses.map((addr, index) => (
              <button
                key={index}
                onClick={() => handleSelectAddress(addr)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  inputAddress === addr
                    ? 'border-green-600 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏠</span>
                  <div className="flex-1">
                    <p className="font-medium">{addr}</p>
                    {index === 0 && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full mt-1 inline-block">
                        기본 주소
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
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
          disabled={!inputAddress.trim() || isLoading}
          className={`flex-1 py-4 rounded-xl text-lg font-bold transition-all ${
            inputAddress.trim() && !isLoading
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isLoading ? '처리 중...' : '다음 단계로'}
        </button>
      </div>
    </div>
  );
};
