import mongoose from "mongoose";
import dotenv from "dotenv";
import DispenseLog from "../models/aiModels.js/DispenseLog.js";
import Inventory from "../models/inventoryModel.js";
import User from "../models/userModel.js";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

// Mock data insert
const seedLogs = async () => {
  const drug = await Inventory.findOne();
  const user = await User.findOne();

  if (!drug || !user) return console.log("Missing drug or user");

  const logs = [];

  for (let i = 0; i < 15; i++) {
    logs.push({
      drug: drug._id,
      quantity: Math.floor(Math.random() * 10) + 1,
      dispensedTo: `Patient ${i}`,
      facility: user.facility,
      dispensedBy: user._id,
      note: "Routine supply",
    });
  }

  await DispenseLog.insertMany(logs);
  console.log("Dispense logs seeded ✅");
  process.exit();
};

seedLogs();
