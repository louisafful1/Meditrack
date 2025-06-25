import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv'; 
import cookieParser from 'cookie-parser';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js'
import facilityRoutes from './routes/facilityRoutes.js';
import InventoryRoutes from './routes/inventoryRoutes.js';
import dispensationRoutes from './routes/dispensationRoutes.js';
import redistributionroutes from './routes/redistributionRoutes.js';
import activityLogRoutes from './routes/activityLogRoutes.js';
import { setupDailySnapshotCrons } from './cron/snapshotJob.js';
import aiSnapshotRoutes from './routes/aiRoutes/aiSnapshotRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
// import redisClient from './config/redisClient.js';

dotenv.config();
const port = process.env.PORT || 5000;

connectDB();

 const app = express();

//  await redisClient.connect()

 //Cross-Origin Resource Sharing
 app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
  }));
  

 app.use(express.json());
 app.use(express.urlencoded({extended: true})); 

 app.use(cookieParser());
 
 app.use('/api/users', userRoutes);
 app.use('/api/facilities', facilityRoutes);
 app.use('/api/inventory', InventoryRoutes);
 app.use("/api/dispensations", dispensationRoutes);
 app.use("/api/redistribution", redistributionroutes);
 app.use('/api/activity-logs', activityLogRoutes);

//  ai routes
 app.use('/api/ai', aiSnapshotRoutes);
 app.use('/api/ai', aiRoutes);





app.use(notFound);
app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));

setupDailySnapshotCrons()
