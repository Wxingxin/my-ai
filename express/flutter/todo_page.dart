import 'package:flutter/material.dart';
import '../widgets/glass_card.dart';

enum Priority { low, medium, high }
enum Category { work, study, life, other }

class TodoItem {
  String title;
  bool completed;
  Priority priority;
  Category category;

  TodoItem({
    required this.title,
    this.completed = false,
    this.priority = Priority.medium,
    this.category = Category.other,
  });
}

class TodoPage extends StatefulWidget {
  const TodoPage({super.key});

  @override
  State<TodoPage> createState() => _TodoPageState();
}

class _TodoPageState extends State<TodoPage> {
  final List<TodoItem> _todos = [];
  final TextEditingController _inputController = TextEditingController();
  final TextEditingController _aiController = TextEditingController();
  Priority _selectedPriority = Priority.medium;
  Category _selectedCategory = Category.other;
  int _filterIndex = 0; // 0=全部 1=未完成 2=已完成

  final List<String> _aiMessages = [
    '你可以直接让我帮你新增、完成、删除或整理 Todo，例如：帮我新增一个工作任务"整理周报"。'
  ];
  final List<bool> _aiIsUser = [false];

  final List<String> _aiSuggestions = [
    '帮我列出当前所有待办',
    '新增一个工作 todo：整理周报，优先级高',
    '把已完成的任务告诉我',
    '帮我删除最旧的一条 todo',
  ];

  void _addTodo() {
    final text = _inputController.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _todos.add(TodoItem(
        title: text,
        priority: _selectedPriority,
        category: _selectedCategory,
      ));
    });
    _inputController.clear();
  }

  void _toggleTodo(int index) {
    setState(() => _todos[index].completed = !_todos[index].completed);
  }

  void _deleteTodo(int index) {
    setState(() => _todos.removeAt(index));
  }

  List<TodoItem> get _filteredTodos {
    switch (_filterIndex) {
      case 1: return _todos.where((t) => !t.completed).toList();
      case 2: return _todos.where((t) => t.completed).toList();
      default: return _todos;
    }
  }

  void _sendAiMessage(String text) {
    if (text.trim().isEmpty) return;
    _aiController.clear();
    setState(() {
      _aiMessages.add(text);
      _aiIsUser.add(true);
    });

    // 模拟 AI 响应
    Future.delayed(const Duration(milliseconds: 800), () {
      setState(() {
        _aiMessages.add('好的，我已处理你的请求。实际使用请接入 Express 后端。');
        _aiIsUser.add(false);
      });
    });
  }

  String _priorityLabel(Priority p) {
    switch (p) {
      case Priority.low: return '低';
      case Priority.medium: return '中';
      case Priority.high: return '高';
    }
  }

  Color _priorityColor(Priority p) {
    switch (p) {
      case Priority.low: return Colors.greenAccent;
      case Priority.medium: return Colors.amberAccent;
      case Priority.high: return Colors.redAccent;
    }
  }

  @override
  void dispose() {
    _inputController.dispose();
    _aiController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final pending = _todos.where((t) => !t.completed).length;
    final done = _todos.where((t) => t.completed).length;

    return Row(
      children: [
        // 主 Todo 区域
        Expanded(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: GlassCard(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 标题
                  Row(
                    children: [
                      const Icon(Icons.check_box_outlined, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      const Text('Todo', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text('任务清单',
                      style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                  Text('$pending 个待处理，$done 个已完成',
                      style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13)),
                  const SizedBox(height: 20),

                  // 输入区
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.15)),
                          ),
                          child: TextField(
                            controller: _inputController,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: '快速新增一个 Todo',
                              hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
                              border: InputBorder.none,
                            ),
                            onSubmitted: (_) => _addTodo(),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _DropdownGlass<Priority>(
                        value: _selectedPriority,
                        label: '优先级',
                        items: Priority.values,
                        labelBuilder: (p) => '优先级 ${_priorityLabel(p)}',
                        onChanged: (v) => setState(() => _selectedPriority = v!),
                      ),
                      const SizedBox(width: 8),
                      _DropdownGlass<Category>(
                        value: _selectedCategory,
                        label: '分类',
                        items: Category.values,
                        labelBuilder: (c) => '分类 ${c.name}',
                        onChanged: (v) => setState(() => _selectedCategory = v!),
                      ),
                      const SizedBox(width: 8),
                      InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: _addTodo,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.25),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.add, color: Colors.white, size: 16),
                              SizedBox(width: 4),
                              Text('添加', style: TextStyle(color: Colors.white)),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // 过滤 Tab
                  Row(
                    children: ['全部', '未完成', '已完成'].asMap().entries.map((e) {
                      final isSelected = _filterIndex == e.key;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(20),
                          onTap: () => setState(() => _filterIndex = e.key),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? Colors.white.withOpacity(0.25)
                                  : Colors.white.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Text(e.value,
                                style: const TextStyle(color: Colors.white, fontSize: 13)),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),

                  // Todo 列表
                  Expanded(
                    child: _filteredTodos.isEmpty
                        ? Center(
                            child: Text(
                              '当前筛选下还没有 Todo',
                              style: TextStyle(color: Colors.white.withOpacity(0.5)),
                            ),
                          )
                        : ListView.builder(
                            itemCount: _filteredTodos.length,
                            itemBuilder: (context, i) {
                              final todo = _filteredTodos[i];
                              final realIndex = _todos.indexOf(todo);
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                                  ),
                                  child: Row(
                                    children: [
                                      InkWell(
                                        onTap: () => _toggleTodo(realIndex),
                                        child: Icon(
                                          todo.completed
                                              ? Icons.check_circle
                                              : Icons.radio_button_unchecked,
                                          color: todo.completed
                                              ? Colors.greenAccent
                                              : Colors.white54,
                                          size: 22,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          todo.title,
                                          style: TextStyle(
                                            color: todo.completed
                                                ? Colors.white38
                                                : Colors.white,
                                            decoration: todo.completed
                                                ? TextDecoration.lineThrough
                                                : null,
                                            fontSize: 14,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: _priorityColor(todo.priority).withOpacity(0.2),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          _priorityLabel(todo.priority),
                                          style: TextStyle(
                                            color: _priorityColor(todo.priority),
                                            fontSize: 11,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      InkWell(
                                        onTap: () => _deleteTodo(realIndex),
                                        child: const Icon(Icons.close,
                                            color: Colors.white38, size: 18),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
          ),
        ),

        // AI 侧边助手
        Container(
          width: 300,
          margin: const EdgeInsets.only(top: 24, right: 24, bottom: 24),
          child: GlassCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.smart_toy_outlined, color: Colors.white, size: 16),
                    SizedBox(width: 8),
                    Text('Todo AI', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 4),
                const Text('侧边助手',
                    style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('直接和 AI 说你的任务安排，它会帮你操作 Todo。',
                    style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12)),
                const SizedBox(height: 16),

                // AI 消息列表
                Expanded(
                  child: ListView.builder(
                    itemCount: _aiMessages.length,
                    itemBuilder: (context, i) {
                      final isUser = _aiIsUser[i];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isUser
                                ? Colors.white.withOpacity(0.18)
                                : Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: isUser
                              ? Text(
                                  _aiMessages[i],
                                  style: const TextStyle(color: Colors.white, fontSize: 13),
                                )
                              : Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.smart_toy_outlined, color: Colors.white54, size: 14),
                                        SizedBox(width: 4),
                                        Text('Todo AI', style: TextStyle(color: Colors.white54, fontSize: 11)),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(_aiMessages[i],
                                        style: const TextStyle(color: Colors.white, fontSize: 13)),
                                  ],
                                ),
                        ),
                      );
                    },
                  ),
                ),

                // 建议
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: _aiSuggestions.map((s) => InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () => _sendAiMessage(s),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white.withOpacity(0.15)),
                      ),
                      child: Text(s, style: const TextStyle(color: Colors.white70, fontSize: 11)),
                    ),
                  )).toList(),
                ),
                const SizedBox(height: 8),

                // AI 输入框
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.15)),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _aiController,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: '例如：新增一个学习任务...',
                            hintStyle: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 12),
                            border: InputBorder.none,
                          ),
                          onSubmitted: _sendAiMessage,
                        ),
                      ),
                      InkWell(
                        onTap: () => _sendAiMessage(_aiController.text),
                        child: const Icon(Icons.arrow_upward, color: Colors.white54, size: 18),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _DropdownGlass<T> extends StatelessWidget {
  final T value;
  final String label;
  final List<T> items;
  final String Function(T) labelBuilder;
  final ValueChanged<T?> onChanged;

  const _DropdownGlass({
    required this.value,
    required this.label,
    required this.items,
    required this.labelBuilder,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.15)),
      ),
      child: DropdownButton<T>(
        value: value,
        dropdownColor: const Color(0xFF7B5EA7),
        style: const TextStyle(color: Colors.white),
        underline: const SizedBox(),
        icon: const Icon(Icons.keyboard_arrow_down, color: Colors.white),
        items: items.map((item) => DropdownMenuItem(
          value: item,
          child: Text(labelBuilder(item), style: const TextStyle(color: Colors.white, fontSize: 13)),
        )).toList(),
        onChanged: onChanged,
      ),
    );
  }
}
