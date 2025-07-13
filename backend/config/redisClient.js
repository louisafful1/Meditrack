import dotenv from "dotenv"
dotenv.config();
import { createClient } from 'redis';

const redisClient = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOSTNAME,
    port:process.env.REDIS_PORT
  }
});

redisClient.on('error', err => console.log('Redis Client Error', err));

redisClient.connect()
  .then(() => console.log('Redis client connected successfully!'))
  .catch((err) => {
    console.error('Failed to connect to Redis:', err);
    process.exit(1); 
  });
export default redisClient;



