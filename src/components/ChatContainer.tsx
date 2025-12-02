import React, { useState, useCallback } from 'react';
import { Message, OrderItem, ChatMessage, InputType, UiAction } from '../types';
import { chatApi } from '../services/chatApi';
import { productApi } from '../services/productApi';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import OrderSummary from './OrderSummary';
import ConfirmModal from './ConfirmModal';

const ChatContainer: React.FC = () => {
  // UI용 메시지 목록
  const [messages, setMessages] = useState<Message[]>([]);
  // API 전송용 대화 히스토리
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  // 임시장바구니 (AI 대화로 추가되는 주문 아이템)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  // 선택된 배달 주소
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  // 상태
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(chatApi.isLoggedIn());
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // 모달 상태
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // UI 메시지 추가
  const addMessage = useCallback((content: string, sender: 'user' | 'ai', type: InputType) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      content,
      sender,
      timestamp: new Date(),
      type,
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  // 대화 히스토리에 추가
  const addToHistory = useCallback((role: 'user' | 'assistant', content: string) => {
    setConversationHistory((prev) => [...prev, { role, content }]);
  }, []);

  // uiAction 처리
  const handleUiAction = useCallback((uiAction: UiAction) => {
    switch (uiAction) {
      case 'SHOW_CONFIRM_MODAL':
        setShowConfirmModal(true);
        break;
      case 'SHOW_CANCEL_CONFIRM':
        setShowCancelModal(true);
        break;
      case 'UPDATE_ORDER_LIST':
      case 'NONE':
      default:
        // 기본 동작: 임시장바구니 업데이트 (이미 처리됨)
        break;
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      await chatApi.login(loginForm.username, loginForm.password);
      setIsLoggedIn(true);
      addMessage('안녕하세요! Mr.Daeback입니다. 무엇을 주문하시겠어요?', 'ai', 'text');
    } catch (error) {
      setLoginError('로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.');
    }
  };

  const handleLogout = () => {
    chatApi.logout();
    setIsLoggedIn(false);
    setMessages([]);
    setConversationHistory([]);
    setOrderItems([]);
    setTotalPrice(0);
    setSelectedAddress(null);
  };

  const handleSendMessage = useCallback(async (content: string, type: InputType, audioData?: string) => {
    if (type === 'text') {
      addMessage(content, 'user', type);
    }
    setIsLoading(true);

    try {
      let response;

      if (type === 'voice' && audioData) {
        response = await chatApi.sendVoice(audioData, conversationHistory, orderItems);
        // 음성 입력의 경우 STT 결과를 사용자 메시지로 표시
        if (response.userMessage) {
          addMessage(response.userMessage, 'user', 'voice');
          addToHistory('user', response.userMessage);
        }
      } else {
        response = await chatApi.sendMessage(content, conversationHistory, orderItems);
        addToHistory('user', content);
      }

      // AI 응답 추가
      addMessage(response.assistantMessage, 'ai', 'text');
      addToHistory('assistant', response.assistantMessage);

      // 임시장바구니 업데이트
      const newOrderItems = response.currentOrder || [];
      setOrderItems(newOrderItems);
      setTotalPrice(response.totalPrice || 0);

      // 선택된 주소 업데이트
      if (response.selectedAddress) {
        setSelectedAddress(response.selectedAddress);
      }

      // uiAction 처리
      if (response.uiAction) {
        handleUiAction(response.uiAction);
      }

    } catch (error: any) {
      console.error('채팅 에러:', error);
      if (error.message?.includes('인증')) {
        setIsLoggedIn(false);
        addMessage('로그인이 필요합니다.', 'ai', 'text');
      } else {
        addMessage('서버 연결에 실패했어요. 다시 시도해주세요.', 'ai', 'text');
      }
    } finally {
      setIsLoading(false);
    }
  }, [conversationHistory, orderItems, addMessage, addToHistory, handleUiAction]);

  // 장바구니에 담기 (Cart API 호출) - 각 아이템마다 별도의 Cart 생성 (GUI와 동일)
  const handleSubmitToCart = useCallback(async () => {
    try {
      // 완성된 아이템만 필터링 (servingStyleId와 quantity가 있는 것만)
      const completedItems = orderItems.filter(
        item => item.servingStyleId && item.quantity > 0
      );

      if (completedItems.length === 0) {
        addMessage('장바구니에 담을 완성된 주문이 없어요.', 'ai', 'text');
        return;
      }

      const cartIds: string[] = [];

      // 각 아이템마다 Product 생성 → Cart 생성 (1 Cart = 1 Product)
      for (const item of completedItems) {
        // 1. Product 생성
        const productResponse = await productApi.createProduct({
          dinnerId: item.dinnerId,
          servingStyleId: item.servingStyleId!,
          quantity: item.quantity,
          productName: `${item.dinnerName} - ${item.servingStyleName}`,
          address: selectedAddress || '매장 픽업',
        });

        // 2. 해당 Product로 Cart 생성 (1 Cart = 1 Product)
        const cartResponse = await productApi.createCart({
          items: [{ productId: productResponse.id, quantity: 1 }],
          deliveryAddress: selectedAddress || undefined,
          deliveryMethod: selectedAddress ? 'Delivery' : 'Pickup',
        });

        cartIds.push(cartResponse.id);
      }

      addMessage(
        `장바구니에 담았습니다!\n` +
        `총 ${cartIds.length}개의 장바구니가 생성되었습니다.\n` +
        `총액: ${totalPrice.toLocaleString()}원\n\n` +
        `결제는 별도 화면에서 진행해주세요.`,
        'ai',
        'text'
      );

      // 초기화
      setOrderItems([]);
      setTotalPrice(0);
      setConversationHistory([]);
      setSelectedAddress(null);

    } catch (error: any) {
      console.error('장바구니 담기 에러:', error);
      if (error.message?.includes('인증')) {
        setIsLoggedIn(false);
        addMessage('로그인이 필요합니다.', 'ai', 'text');
      } else {
        addMessage('장바구니에 담는 데 실패했어요. 다시 시도해주세요.', 'ai', 'text');
      }
    }
  }, [orderItems, totalPrice, selectedAddress, addMessage]);

  // 모달에서 확정 클릭 시
  const handleConfirmOrder = useCallback(() => {
    setShowConfirmModal(false);
    handleSubmitToCart();
  }, [handleSubmitToCart]);

  // 주문 취소 처리
  const handleCancelOrder = useCallback(() => {
    setOrderItems([]);
    setTotalPrice(0);
    setConversationHistory([]);
    setSelectedAddress(null);
    setShowCancelModal(false);
    addMessage('주문이 취소되었습니다. 새로운 주문을 시작해주세요.', 'ai', 'text');
  }, [addMessage]);

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col h-screen bg-gray-100">
        <header className="bg-blue-500 text-white px-4 py-3 shadow-md">
          <h1 className="text-lg font-semibold">음성 주문</h1>
          <p className="text-sm text-blue-100">Mr.Daeback</p>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <form onSubmit={handleLogin} className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm">
            <h2 className="text-xl font-semibold mb-4 text-center">로그인</h2>

            {loginError && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">
                {loginError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">아이디</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">비밀번호</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
            >
              로그인
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="bg-blue-500 text-white px-4 py-3 shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold">음성 주문</h1>
          <p className="text-sm text-blue-100">Mr.Daeback</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
        >
          로그아웃
        </button>
      </header>

      {orderItems.length > 0 && (
        <OrderSummary
          orderItems={orderItems}
          totalPrice={totalPrice}
        />
      )}

      <MessageList messages={messages} isLoading={isLoading} />

      <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />

      {/* 장바구니 담기 확인 모달 */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="장바구니 담기"
        message={`총 ${totalPrice.toLocaleString()}원을 장바구니에 담으시겠습니까?`}
        confirmText="담기"
        cancelText="취소"
        onConfirm={handleConfirmOrder}
        confirmColor="green"
      />

      {/* 주문 취소 모달 */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="주문 취소"
        message="현재 주문을 취소하시겠습니까? 임시장바구니가 초기화됩니다."
        confirmText="취소하기"
        cancelText="돌아가기"
        onConfirm={handleCancelOrder}
        confirmColor="red"
      />
    </div>
  );
};

export default ChatContainer;
