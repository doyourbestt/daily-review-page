// 预设账号配置
// 管理员可以在这里添加/修改用户账号

const USER_ACCOUNTS = {
    // 格式：用户名: 密码
    "小红": "abc123",
    "小明": "xyz789",
    "小花": "pass456",
    "小蓝": "blue2024",
    "小绿": "green2024"
};

// 用户信息
const USER_PROFILES = {
    "小红": {
        avatar: "🧑‍💻",
        role: "管理员",
        bio: "元气满满的一天！"
    },
    "小明": {
        avatar: "👨‍🎨",
        role: "成员",
        bio: "每天都在进步"
    },
    "小花": {
        avatar: "👩‍🔬",
        role: "成员",
        bio: "复盘让我更了解自己"
    },
    "小蓝": {
        avatar: "🧙‍♂️",
        role: "成员",
        bio: "慢慢变好"
    },
    "小绿": {
        avatar: "🦸‍♀️",
        role: "成员",
        bio: "成长中"
    }
};

// 暴露到全局
window.USER_ACCOUNTS = USER_ACCOUNTS;
window.USER_PROFILES = USER_PROFILES;

// 导出（如果需要）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { USER_ACCOUNTS, USER_PROFILES };
}
