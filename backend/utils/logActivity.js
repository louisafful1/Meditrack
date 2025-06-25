import ActivityLog from '../models/activityLogModel.js';

export const logActivity = async ({ userId, action, module, targetId, message }) => {
  try {
    await ActivityLog.create({
      user: userId,
      action,
      module,
      targetId,
      message,
    });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};
