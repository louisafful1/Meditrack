const logInventoryAction = async ({ req, item, action }) => {
  await logActivity({
    userId: req.user._id,
    action,
    module: "Inventory",
    targetId: item._id,
    message: `${req.user.name} ${action.toLowerCase()} ${item.drugName} batch ${item.batchNumber}`,
  });
};
