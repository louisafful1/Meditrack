import cron from "node-cron";
import Inventory from "../models/inventoryModel.js";
import Dispensation from "../models/dispensationModel.js";
import Facility from "../models/facilityModel.js";
import DispenseLog from "../models/aiModels/DispenseLog.js";
import FacilityBehaviorSnapshot from "../models/aiModels/FacilityBehaviorSnapshot.js";
import InventorySnapshot from "../models/aiModels/InventorySnapshot.js";
import { generateFacilitySnapshots } from "../controllers/aiControllers/snapshotController.js";

const setupDailySnapshotCrons = () => {
  // 1. Inventory Snapshot – 11:58 PM
  cron.schedule("42 22 * * *", async () => {
    console.log("Running daily inventory snapshot...");

    try {
      const allInventories = await Inventory.find().lean();

      const snapshots = allInventories.map(item => ({
        drug: item._id,
        drugName: item.drugName,
        batchNumber: item.batchNumber,
        currentStock: item.currentStock,
        facility: item.facility,
        expiryDate: item.expiryDate,
        location: item.location,
        createdAt: new Date(),
      }));

      await InventorySnapshot.insertMany(snapshots);
      console.log(`Inventory snapshot created: ${snapshots.length} items.`);
    } catch (error) {
      console.error("Inventory Snapshot error:", error.message);
    }
  });

  // 2. Dispense Snapshot – 11:59 PM
  cron.schedule("43 22 * * *", async () => {
    console.log(" Running daily dispense snapshot...");

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const logs = await Dispensation.find({ createdAt: { $gte: yesterday } });

      const mapped = logs.map(log => ({
        drug: log.drug,
        quantity: log.quantityDispensed,
        dispensedTo: log.dispensedTo,
        dispensedBy: log.dispensedBy,
        facility: log.facility,
        note: log.note,
      }));

      await DispenseLog.insertMany(mapped);
      console.log(`Dispense logs snapshot stored (${mapped.length} records).`);
    } catch (err) {
      console.error("Dispense Snapshot error:", err.message);
    }
  });

  // 3. Facility Behavior Snapshot – 12:00 AM
  cron.schedule("44 22 * * *", async () => {
    console.log("Running daily facility behavior snapshot...");

    try {
      const facilities = await Facility.find();

      for (const facility of facilities) {
        const drugs = await Inventory.find({ facility: facility._id });

        for (const drug of drugs) {
          const totalDispensed = await Dispensation.aggregate([
            { $match: { drug: drug._id, facility: facility._id } },
            { $group: { _id: null, total: { $sum: "$quantityDispensed" } } }
          ]);

          const avgUsage = ((totalDispensed[0]?.total || 0) / 30).toFixed(2);
          const level = avgUsage >= 5 ? "high" : avgUsage >= 2 ? "moderate" : "low";

          await FacilityBehaviorSnapshot.create({
            facility: facility._id,
            drugName: drug.drugName,
            currentStock: drug.currentStock,
            averageDailyUsage: avgUsage,
            totalDispensed: totalDispensed[0]?.total || 0,
            totalReceived: drug.currentStock + (totalDispensed[0]?.total || 0),
            calculatedNeedLevel: level,
          });
        }
      }

      console.log("Facility behavior snapshot updated.");
    } catch (err) {
      console.error("Facility Snapshot error:", err.message);
    }
  });

  // 4. Optional: Central snapshot generation using your existing controller – 12:05 AM
  cron.schedule("45 22 * * *", async () => {
    console.log(" Running generateFacilitySnapshots()...");

    try {
      await generateFacilitySnapshots(
        { user: { isAdmin: true } },
        { status: () => ({ json: () => {} }) }
      );
      console.log("Centralized snapshot generation completed.");
    } catch (error) {
      console.error("Central snapshot error:", error.message);
    }
  });
};

export { setupDailySnapshotCrons };
