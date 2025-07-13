import redisClient from "../config/redisClient.js";

const DEFAULT_CACHE_EXPIRY = 3600;

/**
 * Sets data in Redis cache.
 * @param {string} key - The cache key.
 * @param {any} data - The data to cache.
 * @param {number} [expirySeconds=DEFAULT_CACHE_EXPIRY] - Expiry time in seconds.
 */
export const setCache = async (key, data, expirySeconds = DEFAULT_CACHE_EXPIRY) => {
  try {
    await redisClient.setEx(key, expirySeconds, JSON.stringify(data));
    console.log(`Cache set for key: ${key}`);
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
  }
};

/**
 * Gets data from Redis cache.
 * @param {string} key - The cache key.
 * @returns {Promise<any|null>} - The cached data or null if not found/error.
 */
export const getCache = async (key) => {
  try {
    const cachedData = await redisClient.get(key);
    if (cachedData) {
      console.log(`Cache hit for key: ${key}`);
      return JSON.parse(cachedData);
    }
    console.log(`Cache miss for key: ${key}`);
    return null;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Deletes data from Redis cache.
 * @param {string} key - The cache key to delete.
 */
export const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
    console.log(`Cache deleted for key: ${key}`);
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
  }
};