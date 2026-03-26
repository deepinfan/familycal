"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLanguage = "zh" | "en";

const messages = {
  zh: {
    homecal: "HomeCal",
    appTitle: "千千万万的家",
    totalTasks: "总任务",
    pendingTasks: "待办",
    doneTasks: "完成",
    adminPanel: "管理后台",
    logout: "退出",
    tasks: "任务",
    calendar: "日历",
    documents: "文档",
    languageZh: "中文",
    languageEn: "English",
    settings: "设置",
    userSettings: "用户设置",
    defaultLanguage: "界面默认语言",
    themeColor: "主题色",
    themeTeal: "青绿",
    themeOcean: "海蓝",
    themeRose: "玫红",
    themeSlate: "石墨",
    themeAmber: "琥珀",
    themeViolet: "紫罗兰",
    themeMint: "薄荷",
    themeCoral: "珊瑚",
    currentPassword: "当前密码",
    newPassword: "新密码",
    savePassword: "修改密码",
    close: "关闭",
    passwordUpdated: "密码已更新",
    logoutAction: "退出登录",
    systemConfig: "系统设置",
    appTitleConfig: "应用名称",
    appTitleZh: "应用名称（中文）",
    appTitleEn: "应用名称（English）",
    modelServiceConfig: "模型服务配置",
    openaiApiUrl: "OpenAI 兼容 API URL",
    modelName: "Model 名称",
    apiKeyKeepEmpty: "API Key（留空表示不更新）",
    apiKeyConfigured: "已配置新密钥时再输入",
    apiKeyInput: "输入 API Key",
    currentKeyStatus: "当前密钥状态",
    configured: "已配置",
    notConfigured: "未配置",
    saveAppTitleConfig: "保存应用名称",
    saveModelServiceConfig: "保存模型服务配置",
    createRole: "添加角色",
    adminCount: "管理员",
    peopleSuffix: "人",
    namePlaceholder: "姓名",
    emojiPlaceholder: "头像 emoji",
    initialPasswordPlaceholder: "初始密码（至少 6 位）",
    add: "添加",
    roles: "角色列表",
    roleInlineEditHint: "角色信息和密码都在当前区域内编辑。",
    adminRolePasswordOnlyHint: "管理员仅允许修改密码。",
    edit: "编辑",
    changePassword: "改密",
    delete: "删除",
    save: "保存",
    cancel: "取消",
    newPasswordFor: "为 {name} 设置新密码（至少 6 位）",
    saveNewPassword: "保存新密码",
    deleteRoleConfirm: "确认删除角色 {name}？如果已被任务或文档引用，系统会拒绝删除。",
    confirmDelete: "确认删除",
    sentenceCreateTask: "一句话创建任务",
    createTask: "新增任务",
    createTaskMode: "创建任务方式",
    parseExample: "例如：本周三下午两点，妈妈去买生日蛋糕",
    parsing: "解析中...",
    parseAndFill: "解析并填入表单",
    oneLineAddTask: "一句话新增任务",
    selfAddTask: "自己添加任务",
    autoParseTask: "自动解析任务",
    manualInputTask: "自己输入任务",
    confirmTask: "确认任务",
    setTaskTime: "设定任务时间",
    titleZh: "中文标题",
    titleZhPlaceholder: "例如：买生日蛋糕",
    titleEn: "英文标题",
    titleEnPlaceholder: "可选英文标题",
    datetime: "时间",
    type: "类型",
    assigneeAll: "负责人：所有人",
    createTaskButton: "创建任务",
    taskConfirm: "任务确认",
    taskContent: "任务内容",
    taskIssuer: "任务下达人",
    taskAssignee: "任务责任人",
    repeatCycle: "重复周期",
    repeatEnabled: "重复",
    repeatUntil: "重复截止日期",
    repeatNone: "不重复",
    repeatDaily: "每天",
    repeatWeekly: "每周",
    repeatMonthly: "每月",
    repeatYearly: "每年",
    loadingTasks: "任务正在加载。",
    loadingAttachments: "正在加载附件...",
    uploading: "上传中...",
    uploadFailed: "上传 {filename} 失败",
    creatingTask: "创建中...",
    saving: "保存中...",
    deleting: "删除中...",
    loadingData: "正在加载数据...",
    loadingImages: "图片加载中...",
    loading: "加载中...",
    offlineTitle: "当前离线",
    offlineMessage: "网络不可用。你仍可查看已缓存页面，恢复网络后数据会自动更新。",
    assignedToMe: "我的任务",
    otherTasks: "他人任务",
    items: "项",
    noMineTasks: "当前没有分配给你的任务。",
    noOtherTasks: "当前没有下达给他人的任务。",
    unfinished: "未完成",
    completed: "已完成",
    assignee: "负责人",
    creator: "创建者",
    finish: "完成",
    statusCancel: "取消",
    saveChanges: "保存修改",
    weekView: "周视图",
    monthView: "月视图",
    previousWeek: "上一周",
    previousMonth: "上一月",
    nextWeek: "下一周",
    nextMonth: "下一月",
    taskCount: "任务",
    dailyQueue: "当日任务",
    noTasksThatDay: "这一天没有任务安排。",
    createSharedDoc: "新增共享文档",
    expand: "展开",
    collapse: "收起",
    docTitlePlaceholder: "标题",
    visibleToAll: "所有人可见",
    createDocument: "创建文档",
    attachments: "附件",
    createdBy: "创建人",
    visibleRange: "可见范围",
    updateFailed: "更新失败",
    deleteDocConfirm: "确认删除《{title}》？",
    calendarSync: "日历同步",
    calendarSyncDesc: "将任务同步到 iPhone 日历",
    subscriptionUrl: "订阅链接",
    copyLink: "复制链接",
    regenerateKey: "重新生成",
    linkCopied: "链接已复制",
    iphoneInstructions: "在 iPhone 日历 App 中：设置 → 账户 → 添加账户 → 其他 → 添加已订阅的日历 → 粘贴上方链接",
    regenerateConfirm: "重新生成将使旧链接失效，确认？",
    loadRolesFailed: "加载角色失败",
    loadConfigFailed: "加载系统配置失败",
    autoTranslateFailed: "自动翻译失败",
    createFailed: "创建失败",
    changePasswordFailed: "改密失败",
    deleteFailed: "删除失败",
    saveConfigFailed: "保存配置失败",
    testFailed: "测试失败",
    testModelFirst: "请先测试配置并选择模型",
    configSaved: "✅ 配置已保存",
    testSuccess: "✅ 测试成功",
    autoTranslating: "自动翻译中...",
    saveButton: "保存",
    testing: "测试中...",
    testButton: "测试",
    chineseName: "中文名",
    englishName: "English Name",
    availableModels: "可用模型（点击选择）",
    supportedFileTypes: "支持：图片、PDF、Word、Excel、PowerPoint、文本文件"
  },
  en: {
    homecal: "HomeCal",
    appTitle: "千千万万的家",
    totalTasks: "Total",
    pendingTasks: "Pending",
    doneTasks: "Done",
    adminPanel: "Admin",
    logout: "Logout",
    tasks: "Tasks",
    calendar: "Calendar",
    documents: "Docs",
    languageZh: "中文",
    languageEn: "English",
    settings: "Settings",
    userSettings: "User Settings",
    defaultLanguage: "Default Language",
    themeColor: "Theme Color",
    themeTeal: "Teal",
    themeOcean: "Ocean",
    themeRose: "Rose",
    themeSlate: "Slate",
    themeAmber: "Amber",
    themeViolet: "Violet",
    themeMint: "Mint",
    themeCoral: "Coral",
    currentPassword: "Current Password",
    newPassword: "New Password",
    savePassword: "Change Password",
    close: "Close",
    passwordUpdated: "Password updated",
    logoutAction: "Log Out",
    systemConfig: "System Settings",
    appTitleConfig: "App Name",
    appTitleZh: "App Name (Chinese)",
    appTitleEn: "App Name (English)",
    modelServiceConfig: "Model Service Config",
    openaiApiUrl: "OpenAI-Compatible API URL",
    modelName: "Model Name",
    apiKeyKeepEmpty: "API Key (leave empty to keep current value)",
    apiKeyConfigured: "Enter only when rotating the key",
    apiKeyInput: "Enter API key",
    currentKeyStatus: "Current key status",
    configured: "Configured",
    notConfigured: "Not configured",
    saveAppTitleConfig: "Save App Name",
    saveModelServiceConfig: "Save Model Service Config",
    createRole: "Add Role",
    adminCount: "Admins",
    peopleSuffix: "",
    namePlaceholder: "Name",
    emojiPlaceholder: "Avatar emoji",
    initialPasswordPlaceholder: "Initial password (min 6 chars)",
    add: "Add",
    roles: "Roles",
    roleInlineEditHint: "Edit role info and password inline here.",
    adminRolePasswordOnlyHint: "Admins can only change password.",
    edit: "Edit",
    changePassword: "Password",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    newPasswordFor: "Set a new password for {name} (min 6 chars)",
    saveNewPassword: "Save Password",
    deleteRoleConfirm: "Delete role {name}? If tasks or docs still reference it, deletion will be rejected.",
    confirmDelete: "Confirm Delete",
    sentenceCreateTask: "Quick Task",
    createTask: "Create Task",
    createTaskMode: "Task creation mode",
    parseExample: "Example: Wednesday 2 PM, Mom buys the birthday cake",
    parsing: "Parsing...",
    parseAndFill: "Parse Into Form",
    oneLineAddTask: "One-Line Task",
    selfAddTask: "Manual Task",
    autoParseTask: "Auto Parse Task",
    manualInputTask: "Manual Input",
    confirmTask: "Confirm Task",
    setTaskTime: "Set Task Time",
    titleZh: "Chinese Title",
    titleZhPlaceholder: "Example: Buy birthday cake",
    titleEn: "English Title",
    titleEnPlaceholder: "Optional English title",
    datetime: "Date & Time",
    type: "Type",
    assigneeAll: "Assignee: Everyone",
    createTaskButton: "Create Task",
    taskConfirm: "Task Review",
    taskContent: "Task Content",
    taskIssuer: "Task Issuer",
    taskAssignee: "Task Owner",
    repeatCycle: "Repeat Cycle",
    repeatEnabled: "Repeat",
    repeatUntil: "Repeat End Date",
    repeatNone: "No Repeat",
    repeatDaily: "Daily",
    repeatWeekly: "Weekly",
    repeatMonthly: "Monthly",
    repeatYearly: "Yearly",
    loadingTasks: "Loading tasks.",
    loadingAttachments: "Loading attachments...",
    uploading: "Uploading...",
    uploadFailed: "Upload {filename} failed",
    creatingTask: "Creating...",
    saving: "Saving...",
    deleting: "Deleting...",
    loadingData: "Loading data...",
    loadingImages: "Loading images...",
    loading: "Loading...",
    offlineTitle: "Currently Offline",
    offlineMessage: "Network unavailable. You can still view cached pages. Data will update automatically when network is restored.",
    assignedToMe: "My Tasks",
    otherTasks: "Others' Tasks",
    items: "items",
    noMineTasks: "No task is currently assigned to you.",
    noOtherTasks: "There are no tasks assigned to others by you.",
    unfinished: "Open",
    completed: "Done",
    assignee: "Assignee",
    creator: "Creator",
    finish: "Done",
    statusCancel: "Cancel",
    saveChanges: "Save Changes",
    weekView: "Week",
    monthView: "Month",
    previousWeek: "Previous Week",
    previousMonth: "Previous Month",
    nextWeek: "Next Week",
    nextMonth: "Next Month",
    taskCount: "Tasks",
    dailyQueue: "Daily Queue",
    noTasksThatDay: "No task is scheduled for this day.",
    createSharedDoc: "New Shared Document",
    expand: "Expand",
    collapse: "Collapse",
    docTitlePlaceholder: "Title",
    visibleToAll: "Visible to everyone",
    createDocument: "Create Document",
    attachments: "Attachments",
    createdBy: "Created by",
    visibleRange: "Visible to",
    updateFailed: "Update failed",
    deleteDocConfirm: "Delete \"{title}\"?",
    calendarSync: "Calendar Sync",
    calendarSyncDesc: "Sync tasks to iPhone Calendar",
    subscriptionUrl: "Subscription URL",
    copyLink: "Copy Link",
    regenerateKey: "Regenerate",
    linkCopied: "Link copied",
    iphoneInstructions: "In iPhone Calendar app: Settings → Accounts → Add Account → Other → Add Subscribed Calendar → Paste the link above",
    regenerateConfirm: "Regenerating will invalidate the old link. Confirm?",
    loadRolesFailed: "Failed to load roles",
    loadConfigFailed: "Failed to load system config",
    autoTranslateFailed: "Auto-translation failed",
    createFailed: "Creation failed",
    changePasswordFailed: "Password change failed",
    deleteFailed: "Deletion failed",
    saveConfigFailed: "Failed to save config",
    testFailed: "Test failed",
    testModelFirst: "Please test config and select a model first",
    configSaved: "✅ Config saved",
    testSuccess: "✅ Test successful",
    autoTranslating: "Auto-translating...",
    saveButton: "Save",
    testing: "Testing...",
    testButton: "Test",
    chineseName: "Chinese Name",
    englishName: "English Name",
    availableModels: "Available Models (click to select)",
    supportedFileTypes: "Supported: Images, PDF, Word, Excel, PowerPoint, Text files"
  }
} as const;

type MessageKey = keyof (typeof messages)["zh"];

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  appTitle: string;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") {
      return "zh";
    }
    const saved = localStorage.getItem("homecal_language");
    return saved === "en" ? "en" : "zh";
  });
  const [appTitleZh, setAppTitleZh] = useState<string>(messages.zh.appTitle);
  const [appTitleEn, setAppTitleEn] = useState<string>(messages.en.appTitle);

  useEffect(() => {
    localStorage.setItem("homecal_language", language);
  }, [language]);

  useEffect(() => {
    function loadConfig() {
      fetch("/api/public/config", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.appTitleZh) setAppTitleZh(String(data.appTitleZh));
          if (data?.appTitleEn) setAppTitleEn(String(data.appTitleEn));
        })
        .catch(() => null);
    }

    function handleConfigUpdated(event: Event) {
      const detail = (event as CustomEvent<{ appTitleZh?: string; appTitleEn?: string }>).detail;
      if (detail?.appTitleZh) setAppTitleZh(detail.appTitleZh);
      if (detail?.appTitleEn) setAppTitleEn(detail.appTitleEn);
    }

    loadConfig();
    window.addEventListener("homecal-config-updated", handleConfigUpdated as EventListener);
    return () => window.removeEventListener("homecal-config-updated", handleConfigUpdated as EventListener);
  }, []);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      appTitle: language === "en" && appTitleEn ? appTitleEn : appTitleZh,
      t(key, vars) {
        let text: string = messages[language][key];
        if (!vars) return text;
        for (const [name, value] of Object.entries(vars)) {
          text = text.replace(`{${name}}`, String(value));
        }
        return text;
      }
    };
  }, [appTitleEn, appTitleZh, language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

export function translateTaskType(type: string, language: AppLanguage) {
  const labels: Record<string, { zh: string; en: string }> = {
    "学习": { zh: "学习", en: "Study" },
    "玩耍": { zh: "玩耍", en: "Play" },
    "家务": { zh: "家务", en: "Housework" },
    "购物": { zh: "购物", en: "Shopping" },
    "其他": { zh: "其他", en: "Other" }
  };

  return labels[type]?.[language] ?? type;
}

export function translateStatus(status: string, language: AppLanguage) {
  const labels: Record<string, { zh: string; en: string }> = {
    pending: { zh: "待办", en: "Pending" },
    done: { zh: "完成", en: "Done" },
    cancelled: { zh: "取消", en: "Cancelled" }
  };

  return labels[status]?.[language] ?? status;
}

export function weekdayLabels(language: AppLanguage) {
  return language === "zh"
    ? ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}
