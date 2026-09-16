const activeUsers = new Map();

// Update user's last active time
const touchUser = (userId) => {
    if (userId) {
        activeUsers.set(userId, Date.now());
    }
};

// Get list of online users (active within the last 5 minutes)
const getOnlineUsers = () => {
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    const online = [];
    
    for (const [userId, lastActive] of activeUsers.entries()) {
        if (now - lastActive <= activeThreshold) {
            online.push(userId);
        } else {
            // Clean up old entries
            activeUsers.delete(userId);
        }
    }
    return online;
};

// Check if a specific user is online
const isUserOnline = (userId) => {
    const lastActive = activeUsers.get(userId);
    if (!lastActive) return false;
    
    const now = Date.now();
    const activeThreshold = 5 * 60 * 1000; // 5 minutes
    return (now - lastActive <= activeThreshold);
};

// Remove user (for logout)
const removeUser = (userId) => {
    if (userId) {
        activeUsers.delete(userId);
    }
};

module.exports = {
    touchUser,
    getOnlineUsers,
    isUserOnline,
    removeUser
};
