import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getAISuggestions } from "../controllers/aiSuggestionController.js";

const aiRoutes = express.Router();

aiRoutes.get("/redistribute", protect, getAISuggestions);

export default aiRoutes;
