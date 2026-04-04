import {
  formatMessageTime,
  formatMessageTimeFull,
  formatDateSeparator,
  getDateKey,
} from '../../utils/formatTime'

const hasMedia = (m) =>
  (m?.mediaId != null && m.mediaId !== 0 && m.mediaId !== '0') || !!m?.localPreviewUrl

export function buildConversationItems({
  messages,
  currentUser,
  correspondentName,
  lastSeenMessageId = null,
  avatarByUserId,
  messageImageByMediaId,
  loadingMediaIds,
}) {
  //Only valid messages filtered
  const messagesToShow = messages?.filter((m) => (m.content != null && String(m.content).trim() !== '') || hasMedia(m)) ?? []
 
  const lastMessageIsMine = messagesToShow.length > 0 && messagesToShow[messagesToShow.length - 1].senderId === currentUser?.userId

  const lastSeenByHimIndex = (() => {
    if (lastSeenMessageId == null || lastMessageIsMine === false) return -1
    let found = -1
    const lastId = Number(lastSeenMessageId)
    messagesToShow.forEach((m, i) => {
      if (m.senderId !== currentUser?.userId) return
      const id = Number(m.id)
      if (id <= lastId) found = i
    })
    return found
  })()

  const items = []
  let lastDateKey = null
  let prevSenderId = null

  messagesToShow.forEach((m, index) => {
    const isMine = m.senderId === currentUser?.userId
    const dateKey = getDateKey(m.time)
    const dateLabel = dateKey ? formatDateSeparator(m.time) : ''

    if (dateKey && dateKey !== lastDateKey && dateLabel) {
      lastDateKey = dateKey
      items.push({
        type: 'date',
        key: `date-${dateKey}`,
        label: dateLabel,
      })
    }

    const isConsecutive = prevSenderId === m.senderId
    prevSenderId = m.senderId

    const messageId = m.id
    const isSeen = isMine && lastSeenMessageId != null && messageId != null && Number(messageId) <= Number(lastSeenMessageId)
    const isSending = !!m.temporaryId
    const hasImage = hasMedia(m)
    const mediaId = m.localPreviewUrl ? null : hasImage ? m.mediaId : null

    items.push({
      type: 'message',
      key: m.id,
      message: m,
      messageId,
      isMine,
      isSeen,
      isSending,
      showSeenIndicator: !isSending && isMine && lastMessageIsMine && index === lastSeenByHimIndex,
      senderUserName: isMine ? currentUser?.userName : correspondentName,
      showAvatar: !isConsecutive,
      formattedTime: formatMessageTime(m.time),
      timeFull: formatMessageTimeFull(m.time),
      //Media correlated
      hasImage,
      imageUrl:
      //Optimistic url
        m.localPreviewUrl ??
        //UrlFromServer
        (m.mediaId != null && m.mediaId !== 0 && m.mediaId !== '0'
          ? messageImageByMediaId?.[m.mediaId] ?? null
          : null),
      mediaId,
      //We have image but is we have no preview 
      //The image is loading / in process..
      imageLoading:
        hasImage &&
        !m.localPreviewUrl &&
        loadingMediaIds?.includes(m.mediaId),
      avatarUrl: avatarByUserId?.[m.senderId],
    })
  })

  return items
}

