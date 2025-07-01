import express from 'express';
import {
  createInventoryItem,
  getInventoryByFacility,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  scanAndSaveInventory,
} from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';
// import { cacheInventory } from '../middleware/cacheMiddleware.js';

const InventoryRoutes = express.Router();

InventoryRoutes.route('/')
  .post(protect, createInventoryItem)
  .get( protect,/* cacheInventory, */ getInventoryByFacility);
  
  InventoryRoutes.post("/scan", protect, scanAndSaveInventory);

InventoryRoutes.route('/:id')
  .get(getInventoryItem)
  .put(updateInventoryItem)
  .delete(deleteInventoryItem);




export default InventoryRoutes;
