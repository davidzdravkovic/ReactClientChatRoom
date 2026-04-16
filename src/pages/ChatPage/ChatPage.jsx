import { useCallback, useEffect, useMemo, useState } from 'react'
import './ChatPage.css'
import { ChatSidebar } from '../../components/ChatSidebar/ChatSidebar'
import ChatArea from '../../components/ChatArea/ChatArea'
import ChatGallery from '../../components/ChatGallery/ChatGallery'
import ImageLightbox from '../../components/ImageLightbox/ImageLightbox'
import { ChatToast } from '../../components/ChatToast/ChatToast'
import { useMediaLoader } from '../../hooks/useMediaLoader'
import { useChatPageState } from '../../hooks/useChatPageState'
import { useChatSubscription } from '../../hooks/useChatSubscription'
import ChatContext from '../../context/ChatContext'

function ChatPage({ currentUser, onLogout }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const { state, actions, subscriptionDeps } = useChatPageState(currentUser)
  const {
    dispatch,
    activeChatRef,
    pendingGalleryRef,
    typingTimeoutRef,
    chatSessionEnvRef,
    bufferOfPendingMessagesRef,
    messageStorageRef,
    temporaryStorageRef,
    prefetchUnknownPeerRef,
  } = subscriptionDeps

  useChatSubscription(
    currentUser,
    dispatch,
    activeChatRef,
    pendingGalleryRef,
    typingTimeoutRef,
    bufferOfPendingMessagesRef,
    chatSessionEnvRef,
    messageStorageRef,
    temporaryStorageRef,
    prefetchUnknownPeerRef,
  )

  const {
    chats,
    messages,
    activeChat,
    galleryOpen,
    galleryMediaIds,
    waitRecentChat,
    typingByChat,
    lastSeenMessageIdByChat,
    fullScreenImageUrl,
    chatAlert,
  } = state

  //This is not causing re-rendering so for now everything that updates those 2 fields have uprfront something that changes state
  //Always is called selected Chat
  const canAttachImage = chatSessionEnvRef.current?.state === 'existingChat' && activeChat?.chatRoomId != null

  const activeChatOnline = useMemo(() => {
    if (!activeChat?.correspondentName) return null
    const match = chats.find((c) => c.correspondentName === activeChat.correspondentName)
    return match?.online ?? null
  }, [activeChat?.correspondentName, chats])

  const {
    selectChat: selectChatBase,
    selectChatByName: selectChatByNameBase,
    handleLoadOlder,
    handleLoadNewer,
    handleSeen,
    handleMessageSent,
    requestGalleryImages,
    closeGallery,
    setFullscreenImage,
    clearFullscreenImage,
    setCounterPagination,
    clearChatAlert,
    onTyping,
    handleChatImageFile,
  } = actions

  const selectChat = useCallback(
    (chat) => {
      selectChatBase(chat)
      setMobileSidebarOpen(false)
    },
    [selectChatBase],
  )

  const selectChatByName = useCallback(
    (name) => {
      selectChatByNameBase(name)
      setMobileSidebarOpen(false)
    },
    [selectChatByNameBase],
  )

  useEffect(() => {
    if (!mobileSidebarOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileSidebarOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileSidebarOpen])

  useEffect(() => {
    const onResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth >= 901) {
        setMobileSidebarOpen(false)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const {
    loadingMediaIds,
    messageImageByMediaId,
    avatarByUserId,
    loadMessageImage,
    uploadProfilePicture,
  } = useMediaLoader(currentUser, chats, activeChat, messages)

  const chatContextValue = useMemo(
    () => ({
      currentUser,
      avatarByUserId,
      messageImageByMediaId,
      loadingMediaIds,
      loadMessageImage,
      onMessageImageClick: setFullscreenImage,
      setCounterPagination,
    }),
    [
      currentUser,
      avatarByUserId,
      messageImageByMediaId,
      loadingMediaIds,
      loadMessageImage,
      setFullscreenImage,
      setCounterPagination,
    ],
  )

  return (
    <ChatContext.Provider value={chatContextValue}>
      <ChatToast alert={chatAlert} onDismiss={clearChatAlert} />
      <div
        className={`chat-page${mobileSidebarOpen ? ' chat-page--sidebar-open' : ''}`}
      >
        <button
          type="button"
          className="chat-page-backdrop"
          aria-label="Close conversation list"
          tabIndex={mobileSidebarOpen ? 0 : -1}
          onClick={() => setMobileSidebarOpen(false)}
        />
        <div className="chat-page-sidebar-wrap">
          <ChatSidebar
            chats={chats}
            activeChat={activeChat}
            onSelectChat={selectChat}
            onSelectChatByName={selectChatByName}
            waitRecentChat={waitRecentChat}
            typingByChat={typingByChat}
            onProfileImageSelect={uploadProfilePicture}
          />
        </div>
        <div className="chat-page-divider" />
        <div className="chat-page-main-wrap">
          <ChatArea
            onOpenChatsList={() => setMobileSidebarOpen(true)}
            onOpenGallery={requestGalleryImages}
            onLogout={onLogout}
            onMessageSent={handleMessageSent}
            activeChat={activeChat}
            canAttachImage={canAttachImage}
            activeChatOnline={activeChatOnline}
            messages={messages}
            typingForActiveChat={
              activeChat?.chatRoomId != null ? typingByChat[activeChat.chatRoomId] : null
            }
            lastSeenMessageId={
              activeChat?.chatRoomId != null
                ? (lastSeenMessageIdByChat[activeChat.chatRoomId] ?? null)
                : null
            }
            onLoadOlder={handleLoadOlder}
            onLoadNewer={handleLoadNewer}
            onSeen={handleSeen}
            onTyping = {onTyping}
            onChatImageFile={handleChatImageFile}
          />
          {galleryOpen && (
            <ChatGallery mediaIds={galleryMediaIds} onClose={closeGallery} />
          )}
          {fullScreenImageUrl && (
            <ImageLightbox
              imageUrl={fullScreenImageUrl}
              onClose={clearFullscreenImage}
            />
          )}
        </div>
      </div>
    </ChatContext.Provider>
  )
}

export default ChatPage
