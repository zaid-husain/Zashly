import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WifiIcon, WifiOffIcon, UsersIcon, ShieldBanIcon } from "lucide-react";
import toast from "react-hot-toast";

import { getUserFriends, getBlockedUsers, unblockUser } from "../lib/api";
import FriendCard from "../components/FriendCard";
import ProfileAvatar from "../components/ProfileAvatar";
import useAuthUser from "../hooks/useAuthUser.js";
import useSocket from "../hooks/useSocket.js";
import { useOnlineRoster, isUserOnline, isRosterReady } from "../hooks/useSocket.js";

const FriendsPage = () => {
  const queryClient = useQueryClient();
  const { authUser } = useAuthUser();
  const { isConnected, emit } = useSocket();
  const [filterStatus, setFilterStatus] = useState("online");
  const [unblockingUserId, setUnblockingUserId] = useState(null);

  useOnlineRoster();

  const { data: apiFriends = [], isLoading: loadingFriends } = useQuery({
    queryKey: ["friends"],
    queryFn: getUserFriends,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  const { data: blockedUsers = [], isLoading: loadingBlocked } = useQuery({
    queryKey: ["blockedUsers"],
    queryFn: getBlockedUsers,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { mutate: handleUnblock } = useMutation({
    mutationFn: unblockUser,
    onMutate: (userId) => {
      setUnblockingUserId(userId);
    },
    onSuccess: (data) => {
      toast.success(data?.message || "User unblocked successfully");
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["blockedUsers"] });
      queryClient.invalidateQueries({ queryKey: ["authUser"] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to unblock user");
    },
    onSettled: () => {
      setUnblockingUserId(null);
    },
  });

  const rosterAvailable = isRosterReady();
  const friends = apiFriends.map((f) => ({
    ...f,
    isOnline: rosterAvailable ? isUserOnline(f._id) : f.isOnline,
  }));

  useEffect(() => {
    if (!isConnected || !authUser?._id) return;

    const timers = [
      setTimeout(() => emit("request-online-roster"), 1000),
      setTimeout(() => emit("request-online-roster"), 3000),
      setTimeout(() => emit("request-online-roster"), 6000),
      setTimeout(() => emit("request-online-roster"), 10000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isConnected, authUser?._id, emit]);

  const onlineCount = friends.filter((f) => f.isOnline).length;
  const offlineCount = friends.filter((f) => !f.isOnline).length;
  const blockedCount = blockedUsers.length;

  const filteredFriends = friends.filter((friend) =>
    filterStatus === "online" ? friend.isOnline : !friend.isOnline
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
          <div className="flex gap-4 items-center">
            <span className="text-sm text-base-content/50">
              {filterStatus === "blocked" ? `${blockedCount} blocked` : `${friends.length} total`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={`btn sm:btn-sm min-h-[44px] sm:min-h-0 flex items-center gap-2 transition-all ${
              filterStatus === "online" ? "btn-primary" : "btn-outline"
            }`}
            onClick={() => setFilterStatus("online")}
          >
            <WifiIcon size={16} className="sm:w-[14px] sm:h-[14px]" />
            Online
            <span
              className={`badge badge-sm sm:badge-xs ml-0.5 ${
                filterStatus === "online" ? "badge-primary-content" : "badge-neutral"
              }`}
            >
              {onlineCount}
            </span>
          </button>

          <button
            type="button"
            className={`btn sm:btn-sm min-h-[44px] sm:min-h-0 flex items-center gap-2 transition-all ${
              filterStatus === "offline" ? "btn-primary" : "btn-outline"
            }`}
            onClick={() => setFilterStatus("offline")}
          >
            <WifiOffIcon size={16} className="sm:w-[14px] sm:h-[14px]" />
            Offline
            <span
              className={`badge badge-sm sm:badge-xs ml-0.5 ${
                filterStatus === "offline" ? "badge-primary-content" : "badge-neutral"
              }`}
            >
              {offlineCount}
            </span>
          </button>

          <button
            type="button"
            className={`btn sm:btn-sm min-h-[44px] sm:min-h-0 flex items-center gap-2 transition-all ${
              filterStatus === "blocked" ? "btn-error text-error-content" : "btn-outline"
            }`}
            onClick={() => setFilterStatus("blocked")}
          >
            <ShieldBanIcon size={16} className="sm:w-[14px] sm:h-[14px]" />
            Blocked
            <span
              className={`badge badge-sm sm:badge-xs ml-0.5 ${
                filterStatus === "blocked" ? "badge-error-content" : "badge-neutral"
              }`}
            >
              {blockedCount}
            </span>
          </button>
        </div>

        {filterStatus === "blocked" ? (
          loadingBlocked ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="card bg-base-200 p-8 text-center">
              <ShieldBanIcon className="mx-auto mb-3 text-base-content/30" size={48} />
              <h3 className="font-semibold text-lg mb-1">No blocked users</h3>
              <p className="text-base-content/60 text-sm">
                You haven't blocked any users. Blocked users will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {blockedUsers.map((user) => (
                <div key={user._id} className="card bg-base-200 shadow-sm border border-base-300">
                  <div className="card-body p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <ProfileAvatar
                        src={user.profilePic}
                        name={user.fullName || user.username}
                        size="w-12 h-12"
                        textSize="text-lg"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{user.fullName}</h3>
                        <p className="text-xs text-base-content/60 truncate">
                          @{user.username || "user"}
                        </p>
                      </div>
                      <span className="badge badge-error badge-sm shrink-0">Blocked</span>
                    </div>

                    <div className="pt-2 border-t border-base-300 flex justify-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline btn-error w-full"
                        disabled={unblockingUserId === user._id}
                        onClick={() => handleUnblock(user._id)}
                      >
                        {unblockingUserId === user._id ? (
                          <span className="loading loading-spinner loading-xs" />
                        ) : (
                          "Unblock User"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loadingFriends ? (
          <div className="flex justify-center py-12">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : friends.length === 0 ? (
          <div className="card bg-base-200 p-8 text-center">
            <UsersIcon className="mx-auto mb-3 text-base-content/30" size={48} />
            <h3 className="font-semibold text-lg mb-1">No friends yet</h3>
            <p className="text-base-content/60 text-sm">
              Connect instantly, talk live, and meet friends — only on Zashly.
            </p>
          </div>
        ) : filteredFriends.length === 0 ? (
          <div className="card bg-base-200 p-8 text-center">
            {filterStatus === "online" ? (
              <>
                <WifiIcon className="mx-auto mb-3 text-base-content/30" size={48} />
                <h3 className="font-semibold text-lg mb-1">No friends online</h3>
                <p className="text-base-content/60 text-sm">
                  None of your friends are online right now. Check back later!
                </p>
              </>
            ) : (
              <>
                <WifiOffIcon className="mx-auto mb-3 text-base-content/30" size={48} />
                <h3 className="font-semibold text-lg mb-1">No offline friends</h3>
                <p className="text-base-content/60 text-sm">
                  All your friends are currently online — great timing!
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFriends.map((friend) => (
              <FriendCard key={friend._id} friend={friend} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;