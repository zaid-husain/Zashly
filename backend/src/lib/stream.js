import logger from "../monitoring/logger.js";
import { StreamChat } from "stream-chat";
import "dotenv/config";

const apiKey =
  process.env.STREAM_API_KEY ||
  process.env.VITE_STREAM_API_KEY ||
  process.env.STEAM_API_KEY;
const apiSecret =
  process.env.STREAM_API_SECRET ||
  process.env.VITE_STREAM_API_SECRET ||
  process.env.STEAM_API_SECRET;

export let streamClient = null;
if (apiKey && apiSecret) {
  try {
    streamClient = StreamChat.getInstance(apiKey, apiSecret);
  } catch (e) {
    logger.error("Stream Chat init failed:", e.message);
  }
} else {
  console.warn("Stream API key or secret missing – chat features disabled");
}

export const upsertStreamUser = async (userData) => {
  if (!streamClient) return userData;
  try {
    await streamClient.upsertUsers([userData]);
    return userData;
  } catch (error) {
    logger.error("Error upserting Stream user:", error);
  }
  return userData;
};

export const generateStreamToken = (userId) => {
  if (!streamClient) {
    logger.error("Cannot generate token: Stream client not initialized");
    return null;
  }
  try {
    const userIdStr = userId.toString();
    return streamClient.createToken(userIdStr);
  } catch (error) {
    logger.error("Error generating Stream token:", error);
  }
  return null;
};

export const ensureStreamUsers = async (userIds = []) => {
  if (!streamClient || !userIds?.length) return;
  try {
    const User = (await import("../models/User.js")).default;
    const users = await User.find({ _id: { $in: userIds } }).select("_id fullName username profilePic");
    if (!users.length) return;
    const streamUsers = users.map((u) => ({
      id: u._id.toString(),
      name: u.fullName || u.username || "User",
      image: u.profilePic && !u.profilePic.startsWith("data:") ? u.profilePic : "",
    }));
    await streamClient.upsertUsers(streamUsers);
  } catch (error) {
    logger.error("Error ensuring Stream users:", error.message);
  }
};

export const syncAllUsersToStream = async () => {
  if (!streamClient) return;
  try {
    const User = (await import("../models/User.js")).default;
    const users = await User.find({}).select("_id fullName username profilePic");
    if (!users.length) return;
    const streamUsers = users.map((u) => ({
      id: u._id.toString(),
      name: u.fullName || u.username || "User",
      image: u.profilePic && !u.profilePic.startsWith("data:") ? u.profilePic : "",
    }));
    for (let i = 0; i < streamUsers.length; i += 100) {
      await streamClient.upsertUsers(streamUsers.slice(i, i + 100));
    }
    logger.info(`Synced ${streamUsers.length} users to Stream Chat successfully.`);
  } catch (error) {
    logger.error("Error syncing all users to Stream:", error.message);
  }
};
