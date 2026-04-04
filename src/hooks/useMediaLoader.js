import { useState, useCallback, useEffect, useRef } from 'react'
import { fetchProfileImage, fetchMessageImage } from '../network/mediaServer'
import { getSessionId } from '../network/wsConnection'
import { runProfilePictureUploadPhases } from '../network/profilePictureUpload'

export function useMediaLoader(currentUser, chats, activeChat, messages) {

  const [loadingMediaIds, setLoadingMediaIds] = useState([])
  const [messageImageByMediaId, setMessageImageByMediaId] = useState({})

  //All avatars for profile pictures of all users included also the current user.
  //Key is the user id and the value is the url.
  const [avatarByUserId, setAvatarByUserId] = useState({})

  const messageImageRef = useRef(messageImageByMediaId)
  messageImageRef.current = messageImageByMediaId

  // Synchronous guard: `loadingMediaIds` state updates after render, so duplicate mediaIds in one
  // effect pass (or rapid re-entries) could otherwise start multiple fetches for the same id.
  const inFlightMediaIdsRef = useRef(new Set())

  const avatarRef = useRef(avatarByUserId)
  avatarRef.current = avatarByUserId

  const inFlightAvatarUserIdsRef = useRef(new Set())

  //Fetch profile picture for the current user
  useEffect(() => {
    if (!currentUser?.userId) return

    let cancelled = false
    fetchProfileImage(currentUser.userId).then((url) => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      setAvatarByUserId((prev) => {
        if (prev[currentUser.userId] && prev[currentUser.userId] !== url) {
          URL.revokeObjectURL(prev[currentUser.userId])
        }
        return { ...prev, [currentUser.userId]: url || null }
      })
    })

    return () => { cancelled = true }
  }, [currentUser?.userId])


  //Fetch profile pictures for all other users.
  useEffect(() => {
    if (!currentUser?.userId) return
    
    //FIltering just valid user ids and unique
    const chatUserIds = new Set(chats.map(c => c.otherUserId).filter(Boolean))
    //Take just that are not taken before  
    const newUserIds = [...chatUserIds].filter(uid => !(uid in avatarRef.current))

    //If already taken return
    if (newUserIds.length === 0) return

    let cancelled = false
    Promise.all(
      newUserIds.map(async (uid) => {
        const url = await fetchProfileImage(uid)
        return { uid, url }
      })
    ).then((results) => {
      if (cancelled) {
        results.forEach(r => r.url && URL.revokeObjectURL(r.url))
        return
      }
      setAvatarByUserId(prev => {
        const next = { ...prev }
        results.forEach(({ uid, url }) => {
          next[uid] = url || null
        })
        return next
      })
    })

    return () => { cancelled = true }
  }, [chats])
  
  // Active peer may not appear in `chats` yet (e.g. opened by username). fetchProfileImage resolves
  // with null on 404/error (no throw) — both outcomes are handled in .then.
  useEffect(() => {
    if (!activeChat) return
    const uid = activeChat.otherUserId
    if (uid == null) return
    if (Object.prototype.hasOwnProperty.call(avatarRef.current, uid)) return
    if (inFlightAvatarUserIdsRef.current.has(uid)) return

    inFlightAvatarUserIdsRef.current.add(uid)
    let cancelled = false
    fetchProfileImage(uid).then((url) => {
      inFlightAvatarUserIdsRef.current.delete(uid)
      if (cancelled) {
        if (url) URL.revokeObjectURL(url)
        return
      }
      setAvatarByUserId((prev) => {
        if (prev[uid] && prev[uid] !== url) {
          URL.revokeObjectURL(prev[uid])
        }
        return { ...prev, [uid]: url || null }
      })
    })

    return () => {
      cancelled = true
    }
  }, [activeChat?.otherUserId])

  //Function that is fetching media for messages when:
  //Called in the use Effect when messages are changing and there is media id that is not fetched before.

  const loadMessageImage = useCallback((mediaId) => {
    if (mediaId == null || mediaId === 0 || mediaId === '0') return
    if (messageImageRef.current[mediaId]) return
    if (inFlightMediaIdsRef.current.has(mediaId)) return
    inFlightMediaIdsRef.current.add(mediaId)
    setLoadingMediaIds((prev) => (prev.includes(mediaId) ? prev : [...prev, mediaId]))

    fetchMessageImage(mediaId)
      .then((url) => {
        if (url) {
          setMessageImageByMediaId((prev) => ({ ...prev, [mediaId]: url }))
        }
      })
      .finally(() => {
        inFlightMediaIdsRef.current.delete(mediaId)
        setLoadingMediaIds((prev) => prev.filter((id) => id !== mediaId))
      })
  }, [])

//The idea here is on message change to inspect if any media id to be fetched.
  // Depend on `messages` only: `activeChat` can change before `messages` (see SELECT_ACTIVE_CHAT
  // in chatReducer). Running when only activeChat flips would scan the previous chat's mediaIds.
  useEffect(() => {
    if (!activeChat || !messages?.length) return
    const mediaIds = [
      ...new Set(
        messages
          .map((m) => m.mediaId)
          .filter((id) => id != null && id !== 0 && id !== '0')
      ),
    ]
    mediaIds.forEach((mediaId) => {
      if (messageImageRef.current[mediaId]) return
      loadMessageImage(mediaId)
    })
  }, [messages, loadMessageImage])

  const uploadProfilePicture = useCallback(async (file) => {
    if (!currentUser?.userId || !file) return
    const sid = getSessionId()
    if (sid == null) {
      console.warn('No WebSocket session; cannot upload profile picture')
      return
    }
    try {
      await runProfilePictureUploadPhases(file, currentUser.userId, sid)
      const url = await fetchProfileImage(currentUser.userId)
      setAvatarByUserId((prev) => {
        const old = prev[currentUser.userId]
        //We whant only one unique profile/avatar 
        if (old) URL.revokeObjectURL(old)
        return { ...prev, [currentUser.userId]: url || null }
      })
    } catch (e) {
      console.error('Profile picture upload failed:', e)
    }
  }, [currentUser?.userId])

  return {
    loadingMediaIds,
    messageImageByMediaId,
    avatarByUserId,
    loadMessageImage,
    uploadProfilePicture,
  }
}
