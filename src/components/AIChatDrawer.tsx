import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/useUIStore';
import { useOrderFlowStore } from '../stores/useOrderFlowStore';
import apiClient from '../lib/axios';
import {
  UiAction,
  OrderFlowState,
} from '../types/api';

// ============================================
// 음성 주문용 타입 정의
// ============================================
interface ChatMessageDto {
  role: 'user' | 'assistant';
  content: string;
}

// 레거시 타입 (백엔드 응답용)
interface OrderItemRequestDto {
  dinnerId: string;
  dinnerName: string;
  servingStyleId: string | null;
  servingStyleName: string | null;
  quantity: number;
  basePrice: number;
  unitPrice: number;
  totalPrice: number;
  stylePrice?: number;
  // ★ 커스터마이징: 제외할 구성요소 목록 (예: ["steak", "salad"])
  excludedItems?: string[];
  // ★ 구성요소 수량 (예: {"스테이크": 1, "샐러드": 2})
  components?: Record<string, number>;
  // ★ 개별 상품 식별자 (수량 2개 이상일 때 각각 구분용)
  itemIndex?: number;
}

interface ChatRequestDto {
  message?: string;
  audioBase64?: string;
  audioFormat?: string;
  conversationHistory?: ChatMessageDto[];
  currentOrder?: OrderItemRequestDto[];
  selectedAddress?: string | null;
  currentFlowState?: string;  // 현재 주문 흐름 상태
}

interface ChatResponseDto {
  userMessage: string;
  assistantMessage: string;
  flowState: OrderFlowState;
  uiAction: UiAction;
  currentOrder: OrderItemRequestDto[];
  totalPrice: number;
  selectedAddress: string | null;
  memo: string | null;
  requestedDeliveryTime: string | null;  // 희망 배달 시간 (ISO 형식)
  occasionType: string | null;           // 기념일 종류
}

// ============================================
// AIChatDrawer 컴포넌트
// ============================================
// 역할: LLM 채팅을 통한 주문 플로우
// - 백엔드는 장바구니 상태만 관리
// - CONFIRMING 상태에서 프론트엔드가 Cart API 호출
// ============================================

export const AIChatDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { isAIChatOpen, closeAIChat } = useUIStore();
  const { resetOrder } = useOrderFlowStore();

  // 채팅 상태
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);

  // 주문 상태 (백엔드 통신용)
  const [currentOrder, setCurrentOrder] = useState<OrderItemRequestDto[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [memo, setMemo] = useState<string | null>(null);
  const [requestedDeliveryTime, setRequestedDeliveryTime] = useState<string | null>(null);  // 희망 배달 시간
  const [occasionType, setOccasionType] = useState<string | null>(null);  // 기념일 종류
  const [flowState, setFlowState] = useState<OrderFlowState>(OrderFlowState.IDLE);
  const [isCheckoutCompleted, setIsCheckoutCompleted] = useState(false);  // 결제 완료 플래그

  // 음성 녹음 관련
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 채팅 스크롤 최하단으로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 리사이즈 핸들 마우스 이벤트 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.max(400, Math.min(900, newWidth));
      setDrawerWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Drawer 열릴 때 초기화
  useEffect(() => {
    if (isAIChatOpen && messages.length === 0) {
      // 초기 메시지 - 주소 선택 안내 포함
      // ★ flowState를 SELECTING_ADDRESS로 설정해야 "1번" 입력 시 SELECT_ADDRESS로 분류됨
      setMessages([
        {
          role: 'assistant',
          content: '안녕하세요! Mr.Daeback AI입니다.\n\n프리미엄 디너 배달 서비스에 오신 것을 환영해요!\n\n먼저 배달받으실 주소를 선택해주세요. "주소 보여줘"라고 말씀해주시거나, 바로 "1번" 등으로 선택하실 수 있어요!',
        },
      ]);
      setFlowState(OrderFlowState.SELECTING_ADDRESS);
    }
  }, [isAIChatOpen]);

  // 음성 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('음성 녹음 시작 실패:', error);
      alert('마이크 권한이 필요합니다.');
    }
  };

  // 음성 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 오디오를 Base64로 변환
  const audioToBase64 = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  };

  // 오디오 메시지 전송
  const sendAudioMessage = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);
      const audioBase64 = await audioToBase64(audioBlob);

      // 임시 사용자 메시지 표시 (로딩 중...)
      const tempUserMsg: ChatMessageDto = { role: 'user', content: '(음성 인식 중...)' };
      setMessages((prev) => [...prev, tempUserMsg]);

      const request: ChatRequestDto = {
        audioBase64,
        audioFormat: 'webm',
        conversationHistory: messages,
        currentOrder: currentOrder.length > 0 ? currentOrder : undefined,
        selectedAddress,
        currentFlowState: flowState,  // 현재 상태 전달
      };

      // isAudioMessage=true로 전달하여 음성 메시지임을 표시
      await sendChatRequest(request, true);
    } catch (error) {
      console.error('오디오 전송 실패:', error);
      alert('음성 메시지 전송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 텍스트 메시지 전송
  const sendTextMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || inputMessage.trim();
    if (!messageToSend || isLoading) return;

    if (!overrideMessage) {
      setInputMessage('');
    }

    // 사용자 메시지를 대화에 추가
    const userMsg: ChatMessageDto = { role: 'user', content: messageToSend };
    setMessages((prev) => [...prev, userMsg]);

    try {
      setIsLoading(true);

      const request: ChatRequestDto = {
        message: messageToSend,
        conversationHistory: messages,
        currentOrder: currentOrder.length > 0 ? currentOrder : undefined,
        selectedAddress,
        currentFlowState: flowState,  // 현재 상태 전달
      };

      await sendChatRequest(request);
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      alert('메시지 전송에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 백엔드 API 호출
  const sendChatRequest = async (request: ChatRequestDto, isAudioMessage = false) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      closeAIChat();
      navigate('/login');
      return;
    }

    try {
      const response = await apiClient.post<ChatResponseDto>(
        '/voice-order/chat',
        request
      );

      const data = response.data;

      // 음성 메시지인 경우: 마지막 임시 메시지를 변환된 텍스트로 교체
      if (isAudioMessage && data.userMessage) {
        setMessages((prev) => {
          const updated = [...prev];
          // 마지막 메시지가 임시 음성 메시지이면 교체
          if (updated.length > 0 && updated[updated.length - 1].content === '(음성 인식 중...)') {
            updated[updated.length - 1] = {
              role: 'user',
              content: data.userMessage, // 백엔드에서 변환된 텍스트
            };
          }
          return updated;
        });
      }

      // AI 응답을 대화 히스토리에 추가
      const assistantMsg: ChatMessageDto = {
        role: 'assistant',
        content: data.assistantMessage,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // 백엔드 응답으로 상태 업데이트
      setCurrentOrder(data.currentOrder || []);

      if (data.selectedAddress) {
        setSelectedAddress(data.selectedAddress);
      }

      // flowState와 memo 업데이트
      if (data.flowState) {
        setFlowState(data.flowState);
      }
      if (data.memo) {
        setMemo(data.memo);
      }
      // 배달 시간과 기념일 업데이트
      if (data.requestedDeliveryTime) {
        setRequestedDeliveryTime(data.requestedDeliveryTime);
      }
      if (data.occasionType) {
        setOccasionType(data.occasionType);
      }

      // UI Action 처리
      handleUiAction(data);
    } catch (error: any) {
      console.error('API 호출 실패:', error);
      if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        closeAIChat();
        navigate('/login');
      } else {
        const errorMessage = error.response?.data?.message || '메시지 전송에 실패했습니다.';

        // 에러 메시지를 대화에 추가
        const errorMsg: ChatMessageDto = {
          role: 'assistant',
          content: `죄송해요, 문제가 발생했어요: ${errorMessage}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    }
  };

  // UI Action 처리
  const handleUiAction = async (data: ChatResponseDto) => {
    switch (data.uiAction) {
      case UiAction.SHOW_CONFIRM_MODAL:
        // 장바구니 확인 모달 - 사용자가 "결제할게요"라고 말하면 PROCEED_TO_CHECKOUT으로 처리됨
        break;

      case UiAction.PROCEED_TO_CHECKOUT:
        // ★ 결제 진행 - Cart API 호출 후 주문내역으로 리디렉션
        await handleProceedToCheckout(data);
        break;

      case UiAction.SHOW_CANCEL_CONFIRM:
        // 주문 취소 - 상태 초기화
        setCurrentOrder([]);
        setSelectedAddress(null);
        setMemo(null);
        setFlowState(OrderFlowState.IDLE);
        break;

      case UiAction.UPDATE_ORDER_LIST:
      case UiAction.NONE:
      default:
        // 기본 처리 - 상태는 이미 업데이트됨
        break;
    }
  };

  // ★ 결제 진행 처리 - 백엔드 checkout API 호출 (Product → Cart → Order 한 번에 처리)
  const handleProceedToCheckout = async (_data: ChatResponseDto) => {
    // ★ 이미 결제 완료된 경우 중복 호출 방지
    if (isCheckoutCompleted) {
      console.log('Checkout already completed, skipping...');
      return;
    }

    if (currentOrder.length === 0) {
      alert('장바구니가 비어있습니다.');
      return;
    }

    try {
      // 결제 진행 중 플래그 설정
      setIsCheckoutCompleted(true);
      // ★ 디너 아이템과 추가 메뉴 분리
      // dinnerId가 있는 것 = 디너 아이템, dinnerId가 null인 것 = 추가 메뉴
      const dinnerItems = currentOrder.filter((item) => item.dinnerId && item.quantity > 0 && item.servingStyleId);
      const additionalItems = currentOrder.filter((item) => !item.dinnerId && item.quantity > 0);

      // 유효한 디너 아이템 (커스터마이징 정보 포함)
      const validOrderItems = dinnerItems.map((item) => ({
        dinnerId: item.dinnerId,
        dinnerName: item.dinnerName,
        servingStyleId: item.servingStyleId,
        servingStyleName: item.servingStyleName,
        quantity: item.quantity,
        basePrice: item.basePrice,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        // ★ 커스터마이징 정보 포함
        components: item.components || {},
        excludedItems: item.excludedItems || [],
      }));

      // 추가 메뉴 아이템 변환 (dinnerName에서 "추가: " 제거)
      const additionalMenuItems = additionalItems.map((item) => ({
        menuItemName: item.dinnerName?.replace('추가: ', '') || '',
        quantity: item.quantity,
      }));

      if (validOrderItems.length === 0 && additionalMenuItems.length === 0) {
        alert('주문 가능한 상품이 없습니다.');
        return;
      }

      console.log('Checkout request:', { validOrderItems, additionalMenuItems }); // 디버깅용

      // 백엔드 checkout API 호출 (Product → Cart → Order 한 번에 처리)
      const response = await apiClient.post('/voice-order/checkout', {
        orderItems: validOrderItems,
        additionalMenuItems: additionalMenuItems,
        deliveryAddress: selectedAddress || '',
        memo: memo || '',
        requestedDeliveryTime: requestedDeliveryTime || undefined,  // 희망 배달 시간
        occasionType: occasionType || undefined,  // 기념일 종류
      });

      const result = response.data;

      if (result.success) {
        // 성공 메시지 (혼란스러운 "결제 페이지로 이동합니다" 문구 제거)
        const successMsg: ChatMessageDto = {
          role: 'assistant',
          content: `주문이 완료되었습니다!\n\n주문번호: ${result.orderNumber}\n총 금액: ${Number(result.totalPrice).toLocaleString()}원`,
        };
        setMessages((prev) => [...prev, successMsg]);

        // 잠시 후 주문 내역 페이지로 이동
        setTimeout(() => {
          closeAIChat();
          navigate('/orders');
        }, 2000);
      } else {
        // 실패 메시지
        const errorMsg: ChatMessageDto = {
          role: 'assistant',
          content: `주문 처리 중 오류가 발생했습니다: ${result.errorMessage || '알 수 없는 오류'}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }

    } catch (error: any) {
      console.error('Checkout 실패:', error);
      setIsCheckoutCompleted(false);  // 실패 시 플래그 리셋하여 재시도 가능
      const errorMsg: ChatMessageDto = {
        role: 'assistant',
        content: `주문 처리 중 오류가 발생했습니다: ${error.response?.data?.message || error.message}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
  };

  // 컴포넌트 닫기 시 초기화
  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    closeAIChat();
  };

  // 전체 초기화
  const handleReset = () => {
    resetOrder();
    setCurrentOrder([]);
    setSelectedAddress(null);
    setMemo(null);
    setRequestedDeliveryTime(null);  // 배달 시간 리셋
    setOccasionType(null);  // 기념일 리셋
    setIsCheckoutCompleted(false);  // 결제 완료 플래그 리셋
    // 초기 메시지와 함께 SELECTING_ADDRESS 상태로 리셋
    setMessages([
      {
        role: 'assistant',
        content: '안녕하세요! Mr.Daeback AI입니다.\n\n프리미엄 디너 배달 서비스에 오신 것을 환영해요!\n\n먼저 배달받으실 주소를 선택해주세요. "주소 보여줘"라고 말씀해주시거나, 바로 "1번" 등으로 선택하실 수 있어요!',
      },
    ]);
    setFlowState(OrderFlowState.SELECTING_ADDRESS);
  };

  return (
    <>
      {/* 배경 어둡게 처리 */}
      {isAIChatOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleClose}
        />
      )}

      {/* 슬라이드 사이드바 */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-50 transform ${
          isResizing ? '' : 'transition-transform duration-300 ease-in-out'
        } ${isAIChatOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: `${drawerWidth}px` }}
      >
        {/* 리사이즈 핸들 */}
        <div
          className="absolute left-0 top-0 h-full w-2 cursor-ew-resize z-10 hover:bg-green-200"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          title="크기 조절"
        />

        <div className="flex flex-col h-full">
          {/* 헤더 */}
          <div className="p-4 bg-green-600 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-bold text-lg">Mr. DAEBAK AI</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="text-sm px-2 py-1 bg-green-700 hover:bg-green-800 rounded"
                  title="대화 초기화"
                >
                  초기화
                </button>
                <button onClick={handleClose} className="text-2xl hover:text-gray-200">
                  &times;
                </button>
              </div>
            </div>
          </div>

          {/* 채팅 영역 - AI가 매번 현재 주문 상태를 설명하므로 별도 UI 제거 */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-gray-800 border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={`p-3 rounded-full shadow transition-colors ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
                title={isRecording ? '녹음 중지' : '음성 녹음'}
              >
                🎤
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                placeholder="메시지 입력..."
                disabled={isLoading || isRecording}
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
              />
              <button
                onClick={() => sendTextMessage()}
                disabled={isLoading || isRecording || !inputMessage.trim()}
                className="px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
