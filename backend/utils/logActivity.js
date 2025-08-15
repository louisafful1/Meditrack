import ActivityLog from '../models/activityLogModel.js';

export const logActivity = async ({ userId, facility, action, module, targetId, message }) => {
  try {
    await ActivityLog.create({
      user: userId,
      facility,
      action,
      module,
      targetId,
      message,
    });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};
