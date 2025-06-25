import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  dispenseDrug,
  getDispensations,
} from "../controllers/dispensationController.js";

const dispensationRoutes = express.Router();

dispensationRoutes.route("/")
  .post(protect, dispenseDrug)
  .get(protect, getDispensations);

export default dispensationRoutes;
