import { useMemo } from 'react'
import './ChatPage.css'
import { ChatSidebar } from '../../components/ChatSidebar/ChatSidebar'
import ChatArea from '../../components/ChatArea/ChatArea'
import ChatGallery from '../../components/ChatGallery/ChatGallery'
import ImageLightbox from '../../components/ImageLightbox/ImageLightbox'
import { useMediaLoader } from '../../hooks/useMediaLoader'
import { useChatPageState } from '../../hooks/useChatPageState'
import { useChatSubscription } from '../../hooks/useChatSubscription'
import ChatContext from '../../context/ChatContext'

function ChatPage({ currentUser, onLogout }) {
  const { state, actions, subscriptionDeps } = useChatPageState(currentUser)
  const {
    dispatch,
    activeChatRef,
    pendingGalleryRef,
    typingTimeoutRef,
    chatSessionEnvRef,
    bufferOfPendingMessagesRef,
    messageStorageRef,
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
    selectChat,
    selectChatByName,
    handleLoadOlder,
    handleLoadNewer,
    handleSeen,
    handleMessageSent,
    requestGalleryImages,
    closeGallery,
    setFullscreenImage,
    clearFullscreenImage,
    setCounterPagination,
    onTyping,
    handleChatImageFile,
  } = actions

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
      <div className="chat-page">
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
            onOpenGallery={requestGalleryImages}
            onLogout={onLogout}
            onMessageSent={handleMessageSent}
            activeChat={activeChat}
            canAttachImage={canAttachImage}
            activeChatOnline={activeChatOnline}
            messages={messages}
            typingForActiveChat={activeChat ? typingByChat[activeChat.chatRoomId] : null}
            lastSeenMessageId={
              activeChat ? (lastSeenMessageIdByChat[activeChat.chatRoomId] ?? null) : null
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
