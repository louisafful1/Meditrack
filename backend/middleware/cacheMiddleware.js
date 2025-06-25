// middleware/cacheMiddleware.js
import redisClient from '../config/redisClient.js';
import asyncHandler from 'express-async-handler';

export const cacheInventory = asyncHandler(async (req, res, next) => {
  const key = `inventory:${req.user.facility}`;
  const cachedData = await redisClient.get(key);

  if (cachedData) {
    console.log('Serving from cache');
    res.status(200).json(JSON.parse(cachedData));
  } else {
    next();
  }
});
