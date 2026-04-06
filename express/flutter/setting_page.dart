import 'package:flutter/material.dart';
import '../widgets/glass_card.dart';

class SettingPage extends StatefulWidget {
  const SettingPage({super.key});

  @override
  State<SettingPage> createState() => _SettingPageState();
}

class _SettingPageState extends State<SettingPage> {
  String _language = '简体中文';
  String _theme = 'Glass UI';
  String _mode = '标准模式';
  bool _voiceEnabled = false;

  final List<String> _languages = ['简体中文', '繁體中文', 'English', '日本語'];
  final List<String> _themes = ['Glass UI', 'Dark', 'Light', 'Minimal'];
  final List<String> _modes = ['标准模式', '专注模式', '简洁模式'];

  void _showPicker<T>(
    String title,
    List<String> items,
    String current,
    ValueChanged<String> onSelect,
  ) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF7B5EA7),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(
                    color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            ...items.map((item) => InkWell(
                  onTap: () {
                    onSelect(item);
                    Navigator.pop(ctx);
                  },
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    child: Row(
                      children: [
                        Text(item, style: const TextStyle(color: Colors.white, fontSize: 15)),
                        const Spacer(),
                        if (item == current)
                          const Icon(Icons.check, color: Colors.greenAccent, size: 18),
                      ],
                    ),
                  ),
                )),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 680,
        child: GlassCard(
          padding: const EdgeInsets.all(36),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 标题
              Text(
                'SETTINGS',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.5),
                  fontSize: 11,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Change Your Setting',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 30,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '管理你的语言、主题、模式和语音相关偏好。',
                style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13),
              ),
              const SizedBox(height: 28),

              // 设置项网格
              Row(
                children: [
                  Expanded(
                    child: _SettingTile(
                      label: '你的语言',
                      value: _language,
                      onTap: () => _showPicker('选择语言', _languages, _language,
                          (v) => setState(() => _language = v)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _SettingTile(
                      label: '你的主题',
                      value: _theme,
                      onTap: () => _showPicker('选择主题', _themes, _theme,
                          (v) => setState(() => _theme = v)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _SettingTile(
                      label: '你的模式',
                      value: _mode,
                      onTap: () => _showPicker('选择模式', _modes, _mode,
                          (v) => setState(() => _mode = v)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _SettingTile(
                      label: '语音设置',
                      value: _voiceEnabled ? '已开启' : '暂未开启',
                      onTap: () => setState(() => _voiceEnabled = !_voiceEnabled),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // 底部操作按钮
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _ActionBtn(label: '登录', onTap: () {}),
                  _ActionBtn(label: '注册', onTap: () {}),
                  _ActionBtn(label: '主页面', onTap: () {}),
                  _ActionBtn(
                    label: '退出',
                    onTap: () {},
                    color: Colors.redAccent.withOpacity(0.3),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingTile extends StatelessWidget {
  final String label;
  final String value;
  final VoidCallback onTap;

  const _SettingTile({
    required this.label,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.15)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 12)),
            const SizedBox(height: 6),
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
      ),
    );
  }
}

class _ActionBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _ActionBtn({
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        decoration: BoxDecoration(
          color: color ?? Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white.withOpacity(0.2)),
        ),
        child: Text(label, style: const TextStyle(color: Colors.white)),
      ),
    );
  }
}
