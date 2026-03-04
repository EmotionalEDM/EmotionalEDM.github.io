#!/usr/bin/env python3
# LRC时间戳格式转换工具
# 将 [mm:ss:xx] 格式转换为 [mm:ss.xx] 格式
# 用法：直接运行，按提示操作

import re
import os


def convert_file(input_path, output_path):
    """转换单个文件"""
    try:
        # 尝试UTF-8编码读取
        try:
            with open(input_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except UnicodeDecodeError:
            # 尝试GBK编码
            with open(input_path, 'r', encoding='gbk') as f:
                content = f.read()

        # 转换 [mm:ss:xx] -> [mm:ss.xx]
        pattern = r'\[(\d{2}):(\d{2}):(\d{2})\]'
        converted = re.sub(pattern, r'[\1:\2.\3]', content)

        # 保存转换后的文件
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(converted)

        # 统计转换数量
        count = len(re.findall(pattern, content))
        return True, count

    except Exception as e:
        return False, str(e)


def main():
    print("=" * 50)
    print("LRC时间戳格式转换工具")
    print("功能：将 [mm:ss:xx] 格式转换为 [mm:ss.xx] 格式")
    print("=" * 50)
    print()

    # 获取输入文件路径
    while True:
        input_file = input("请输入LRC文件路径（或拖入文件到此）: ").strip(' "\'')

        if not input_file:
            print("请输入文件路径！")
            continue

        if not os.path.exists(input_file):
            print(f"错误：文件 '{input_file}' 不存在")
            print("请重新输入")
            continue

        if not input_file.lower().endswith('.lrc'):
            print("警告：文件扩展名不是 .lrc")
            choice = input("是否继续？(y/n): ").lower()
            if choice != 'y':
                continue

        break

    # 获取输出文件路径
    default_output = input_file.replace('.lrc', '_converted.lrc').replace('.LRC', '_converted.LRC')
    output_file = input(f"请输入输出文件路径 [默认: {default_output}]: ").strip(' "\'')

    if not output_file:
        output_file = default_output

    # 如果输出文件已存在，询问是否覆盖
    if os.path.exists(output_file):
        choice = input(f"文件 '{output_file}' 已存在，是否覆盖？(y/n): ").lower()
        if choice != 'y':
            print("操作取消")
            return

    # 执行转换
    print()
    print("正在转换...")

    success, result = convert_file(input_file, output_file)

    if success:
        print(f"✓ 转换成功！")
        print(f"  - 转换了 {result} 个时间戳")
        print(f"  - 输出文件: {output_file}")

        # 显示转换示例
        print()
        print("转换示例：")
        with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()[:3]

        for line in lines:
            if '[' in line and ']' in line:
                # 转换这一行作为示例
                converted_line = re.sub(r'\[(\d{2}):(\d{2}):(\d{2})\]', r'[\1:\2.\3]', line)
                print(f"  {line.strip()}")
                print(f"  → {converted_line.strip()}")
                break

    else:
        print(f"✗ 转换失败: {result}")

    print()
    input("按回车键退出...")


if __name__ == "__main__":
    main()