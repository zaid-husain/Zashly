import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import useAuthUser from "../hooks/useAuthUser";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getStreamToken, unblockUser } from "../lib/api";
import { connectStreamUser } from "../lib/streamClient";
import ChatLoader from "../components/ChatLoader";
import CustomMessageRenderer from "../components/CustomMessageRenderer";
import CustomMessageInput from "../components/CustomMessageInput";
import UserProfileModal from "../components/UserProfileModal";
import ChatEffectsWrapper from "../components/ChatEffectsWrapper";
import { MultiSelectProvider, useMultiSelect } from "../context/MultiSelectContext";
import SelectionActionBar from "../components/SelectionActionBar";
import ForwardModal from "../components/ForwardModal";

import {
  Channel,
  Chat,
  MessageInput,
  MessageList,
  Window,
  useChannelStateContext,
} from "stream-chat-react";
import { StreamChat } from "stream-chat";
import toast from "react-hot-toast";
import useSocket from "../hooks/useSocket";
import ProfileAvatar from "../components/ProfileAvatar";
import { Trash2Icon, Moon, Sun, MoreVertical, ShieldBanIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CallButtons from "../features/calls/components/CallButtons";
import "../chat-redesign.css";

const STREAM_API_KEY = import.meta.env.VITE_STREAM_API_KEY;

const ChatPage = () => {
  const { id: targetUserId } = useParams();
  const navigate = useNavigate();
  const [chatClient, setChatClient] = useState(null);
  const [channel, setChannel] = useState(null);
  const [chatTheme, setChatTheme] = useState(() => {
    return localStorage.getItem("stream-chat-theme") || "str-chat__theme-dark";
  });
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const { authUser } = useAuthUser();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const toggleChatTheme = () => {
    const newTheme = chatTheme === "str-chat__theme-dark" ? "str-chat__theme-light" : "str-chat__theme-dark";
    setChatTheme(newTheme);
    localStorage.setItem("stream-chat-theme", newTheme);
  };

  const {
    data: tokenData,
    isLoading: tokenLoading,
    isError: tokenError,
    error: tokenErrorObj,
  } = useQuery({
    queryKey: ["streamToken", targetUserId],
    queryFn: () => getStreamToken(targetUserId),
    enabled: !!authUser,
  });

  const isBlockedByMe = useMemo(() => {
    if (tokenData?.isBlockedByMe) return true;
    const blockedList = authUser?.blockedUsers || [];
    return blockedList.some(
      (id) => String(id?._id || id) === String(targetUserId)
    );
  }, [tokenData?.isBlockedByMe, authUser?.blockedUsers, targetUserId]);

  const isBlockedByTarget = Boolean(tokenData?.isBlockedByTarget);
  const isBlocked = isBlockedByMe || isBlockedByTarget || Boolean(tokenData?.isBlocked);

  const { mutate: unblockChatUser, isPending: isUnblocking } = useMutation({
    mutationFn: () => unblockUser(targetUserId),
    onSuccess: (data) => {
      toast.success(data?.message || "User unblocked successfully");
      queryClient.invalidateQueries({ queryKey: ["streamToken", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to unblock user");
    },
  });

  const receiveSoundRef = useRef(null);
  const sendSoundRef = useRef(null);



  const CustomHeader = () => {
    const { channel } = useChannelStateContext();
    const [menuOpen, setMenuOpen] = useState(false);
    if (!channel) return null;

    const members = Object.values(channel.state.members);
    const otherMember = members.find((m) => m.user.id !== authUser?._id);
    const displayUser = otherMember?.user || {};
    const isOnline = displayUser.online;
    
    let statusText = isOnline ? "Online" : "Offline";
    if (isBlocked) {
      statusText = isBlockedByMe ? "Blocked by you" : "Unavailable";
    } else if (!isOnline && displayUser.last_active) {
      try {
        const lastActive = new Date(displayUser.last_active);
        statusText = `Last seen ${formatDistanceToNow(lastActive, { addSuffix: true })}`;
      } catch (e) {
        // Fallback
      }
    }

    return (
      <div className="premium-chat-header">

        <div 
          className="premium-chat-header-info"
          onClick={() => setShowProfile(true)}
        >
          <div className="relative">
            <ProfileAvatar 
              src={displayUser.image || displayUser.profilePic} 
              name={displayUser.name || displayUser.fullName || "User"} 
              size="w-12 h-12" 
              textSize="text-lg" 
            />
            {isOnline && !isBlocked && (
              <span className="absolute bottom-0 right-0 premium-online-dot border-2 border-white" />
            )}
          </div>
          <div className="premium-chat-header-text pl-1">
            <p className="premium-chat-header-name text-[17px]">
              {displayUser.name || displayUser.fullName || "User"}
            </p>
            <p className="premium-chat-header-status text-[13px] opacity-80">
              {statusText}
            </p>
          </div>
        </div>

        <div className="premium-chat-header-actions relative flex items-center gap-2">
          {!isBlocked ? (
            <CallButtons
              targetId={displayUser.id || targetUserId}
              targetName={displayUser.name || displayUser.fullName}
              targetPic={displayUser.image || displayUser.profilePic}
            />
          ) : (
            <span
              className={`badge ${
                isBlockedByMe ? "badge-error" : "badge-neutral"
              } badge-sm`}
            >
              {isBlockedByMe ? "Blocked" : "Unavailable"}
            </span>
          )}

          <div className="dropdown dropdown-end">
            <button
              tabIndex={0}
              type="button"
              className="premium-icon-btn text-base-content/70 hover:bg-base-200 ml-1"
              title="More Options"
            >
              <MoreVertical className="size-6" />
            </button>
            <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-200">
              <li><a onClick={() => setShowProfile(true)}>View Profile</a></li>
              {isBlockedByMe && (
                <li>
                  <a
                    onClick={() => unblockChatUser()}
                    className="text-error font-medium"
                  >
                    Unblock User
                  </a>
                </li>
              )}
              <li><a onClick={() => setShowClearModal(true)} className="text-error font-medium">Clear Chat</a></li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  const ChatHeaderContainer = () => {
    const { isSelectionMode } = useMultiSelect();
    return isSelectionMode ? <SelectionActionBar isGroupChat={false} /> : <CustomHeader />;
  };

  const handleClearChat = async () => {
    try {
      await channel.truncate();
      toast.success("Chat cleared successfully");
      setShowClearModal(false);
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast.error("Failed to clear chat");
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const initChat = async () => {
      if (!authUser) {
        setLoading(false);
        return;
      }
      if (tokenError) {
        setLoading(false);
        return;
      }
      if (!tokenData?.token) {
        if (!tokenLoading) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const desiredId = String(authUser._id);
        const client = await connectStreamUser(authUser, tokenData.token);
        if (!client) {
          if (!isCancelled) setLoading(false);
          return;
        }

        const channelId = [authUser._id, targetUserId].sort().join("-");

        const currChannel = client.channel("messaging", channelId, {
          members: [authUser._id, targetUserId],
        });

        const shouldMarkRead = authUser?.privacySettings?.readReceipts !== false;
        await currChannel.watch({ mark_read: shouldMarkRead });

        if (isCancelled) return;

        // Get target user info from channel members
        const members = Object.values(currChannel.state.members);
        const target = members.find((m) => m.user_id !== desiredId);
        if (target?.user) {
          setTargetUser({
            id: target.user.id,
            name: target.user.name || "User",
            image: target.user.image || "",
            createdAt: target.user.created_at,
          });
        }

        setChatClient(client);
        setChannel(currChannel);
      } catch (error) {
        console.error("Error initializing chat:", error);
        toast.error("Could not connect to chat. Please try again.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    initChat();

    return () => {
      isCancelled = true;
    };
  }, [tokenData, tokenLoading, tokenError, authUser, targetUserId]);

  // Custom message component wrapper
  const MessageWithExtras = useCallback(
    (props) => (
      <CustomMessageRenderer
        {...props}
        socket={socket}
        isGroupChat={false}
      />
    ),
    []
  );

  if (loading && (tokenLoading || !tokenError)) return <ChatLoader />;

  if (tokenError || !chatClient || !channel) {
    const errorMsg =
      tokenErrorObj?.response?.data?.message ||
      tokenErrorObj?.message ||
      (!STREAM_API_KEY
        ? "Stream API key missing in environment configuration."
        : "Unable to connect to chat. Please try again.");

    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <p className="text-lg font-semibold mb-2">Chat Connection Error</p>
        <p className="text-sm opacity-70 mb-4 max-w-sm">{errorMsg}</p>
        <div className="flex gap-2">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setLoading(true);
              queryClient.invalidateQueries({ queryKey: ["streamToken"] });
            }}
          >
            Retry
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate("/app")}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const chatWallpaperStyle = authUser?.chatWallpaper
    ? { 
        backgroundImage: `url(${authUser.chatWallpaper})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : {};

  const showThreeBackground = !authUser?.chatWallpaper;

  return (
    <div className="h-full relative overflow-hidden">
      <audio ref={receiveSoundRef} src="/message-receive.wav" preload="auto" />
      <audio ref={sendSoundRef} src="/message-send.wav" preload="auto" />

      <Chat client={chatClient} theme={chatTheme}>
        <Channel channel={channel}>
          <ChatEffectsWrapper showBackground={showThreeBackground}>
            {({ onSendParticles }) => (
              <div 
                className={`premium-chat-layout transition-all duration-500 ${
                  authUser?.chatWallpaper 
                    ? 'bg-transparent' 
                    : chatTheme === 'str-chat__theme-light'
                      ? 'bg-slate-50'
                      : 'bg-slate-900'
                }`}
                style={chatWallpaperStyle}
              >
                <MultiSelectProvider>
                  <Window>
                    <ChatHeaderContainer />
                    <MessageList
                    Message={MessageWithExtras}
                    messageActions={['edit', 'delete', 'flag', 'mute', 'pin', 'quote', 'react']}
                  />
                  {isBlocked ? (
                    <div className="p-4 bg-base-200/90 backdrop-blur border-t border-base-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left z-10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-error/15 text-error shrink-0">
                          <ShieldBanIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {isBlockedByMe ? "You have blocked this user" : "This user is unavailable"}
                          </p>
                          <p className="text-xs text-base-content/60">
                            {isBlockedByMe
                              ? "You cannot send or receive messages or start calls with blocked users."
                              : "You cannot send messages or start calls with this user."}
                          </p>
                        </div>
                      </div>
                      {isBlockedByMe && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline btn-error min-w-[100px]"
                          disabled={isUnblocking}
                          onClick={() => unblockChatUser()}
                        >
                          {isUnblocking ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            "Unblock"
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <MessageInput
                      focus
                      additionalTextareaProps={{
                        onKeyDown: (e) => {
                          const enterToSend =
                            authUser?.appSettings?.general?.enterToSend ?? true;
                          if (!enterToSend && e.key === "Enter" && !e.shiftKey) {
                            e.stopPropagation();
                          }
                        },
                      }}
                      Input={(props) => (
                        <CustomMessageInput
                          {...props}
                          isGroupChat={false}
                          onSendParticles={onSendParticles}
                        />
                      )}
                    />
                  )}
                </Window>
                <ForwardModal />
                
                {showProfile && (
                  <UserProfileModal 
                    user={targetUser} 
                    onClose={() => setShowProfile(false)}
                  />
                )}

                {/* Clear Chat Confirmation Modal */}
                {showClearModal && (
                  <div className="modal modal-open z-[100]">
                    <div className="modal-box chat-modal-3d">
                      <h3 className="font-bold text-lg">Clear Chat?</h3>
                      <p className="py-4">Are you sure you want to delete all messages in this chat? This action cannot be undone.</p>
                      <div className="modal-action">
                        <button className="btn btn-ghost" onClick={() => setShowClearModal(false)}>Cancel</button>
                        <button className="btn btn-error" onClick={handleClearChat}>Clear All</button>
                      </div>
                    </div>
                    <div className="modal-backdrop bg-black/40" onClick={() => setShowClearModal(false)}></div>
                  </div>
                )}
                </MultiSelectProvider>
              </div>
            )}
          </ChatEffectsWrapper>

        </Channel>
      </Chat>
    </div>
  );
};

export default ChatPage;
