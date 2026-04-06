# Aria Flutter

你的 Next.js 项目的 Flutter 重写版本，保持相同的功能和视觉风格。

## 项目结构

```
lib/
├── main.dart               # 入口 + 主布局（侧边栏 + 页面切换）
├── pages/
│   ├── chat_page.dart      # 对话助手页（含会话列表）
│   ├── todo_page.dart      # Todo 任务清单（含 AI 侧边助手）
│   ├── news_page.dart      # 新闻助手页
│   ├── profile_page.dart   # 个人资料页
│   └── setting_page.dart   # 设置页
└── widgets/
    └── glass_card.dart     # 玻璃态卡片组件（复用）
```

## 功能说明

| 页面 | 功能 |
|------|------|
| 对话助手 | 多会话聊天，发送消息，AI 回复（接入后端后生效） |
| Todo | 增删改查任务，优先级/分类，AI 侧边助手 |
| 新闻 | 输入主题，AI 搜索并总结新闻 |
| Profile | 头像、昵称、邮箱、简介编辑保存 |
| Setting | 语言、主题、模式、语音开关，登录/注册/退出 |

## 接入 Express 后端

在各个页面里搜索 `// 模拟` 注释，替换成实际的 HTTP 请求即可，例如：

```dart
// chat_page.dart 中替换模拟回复
final response = await http.post(
  Uri.parse('http://your-server/api/chat'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'message': text, 'history': _messages}),
);
final data = jsonDecode(response.body);
// 使用 data['reply'] 更新 UI
```

## 运行

```bash
flutter pub get
flutter run
```

## 设计风格

- 紫粉渐变背景（与原 Next.js 版本一致）
- 玻璃态（glassmorphism）卡片和组件
- 白色文字，半透明元素
- 简洁直观的布局，左侧导航栏固定
