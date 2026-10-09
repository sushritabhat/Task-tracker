function formatUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        xp: user.xp || 0,
        level: user.level || 1,
        streakCount: user.streakCount || 0,
        lastActiveDate: user.lastActiveDate || "",
        badges: user.badges || ["Starter"]
    };
}

module.exports = formatUser;
