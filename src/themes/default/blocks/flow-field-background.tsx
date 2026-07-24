'use client';

import { useEffect, useRef } from 'react';

type 坐标 = {
  x: number;
  y: number;
};

const 光团配置 = [
  { x: 0.18, y: 0.35, size: 0.42, color: [99, 102, 241] },
  { x: 0.76, y: 0.26, size: 0.38, color: [56, 189, 248] },
  { x: 0.58, y: 0.78, size: 0.34, color: [139, 92, 246] },
  { x: 0.38, y: 0.67, size: 0.25, color: [245, 158, 11] },
] as const;

export function FlowFieldBackground() {
  const 画布引用 = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const 画布 = 画布引用.current;
    const 容器 = 画布?.parentElement;
    if (!画布 || !容器) return;

    const 上下文 = 画布.getContext('2d');
    if (!上下文) return;

    const 减少动态效果 = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const 指针目标: 坐标 = { x: 0.5, y: 0.46 };
    const 指针位置: 坐标 = { x: 0.5, y: 0.46 };
    const 上次指针: 坐标 = { x: 0.5, y: 0.46 };
    let 指针强度 = 0;
    let 指针在场 = false;
    let 动画帧 = 0;
    let 起始时间 = performance.now();

    const 调整尺寸 = () => {
      const 边界 = 容器.getBoundingClientRect();
      const 像素比 = Math.min(window.devicePixelRatio || 1, 1.5);
      画布.width = Math.max(1, Math.round(边界.width * 像素比));
      画布.height = Math.max(1, Math.round(边界.height * 像素比));
      画布.style.width = `${边界.width}px`;
      画布.style.height = `${边界.height}px`;
      上下文.setTransform(像素比, 0, 0, 像素比, 0, 0);
    };

    const 记录指针 = (事件: PointerEvent) => {
      const 边界 = 容器.getBoundingClientRect();
      const x = (事件.clientX - 边界.left) / 边界.width;
      const y = (事件.clientY - 边界.top) / 边界.height;
      指针在场 = x >= 0 && x <= 1 && y >= 0 && y <= 1;
      if (!指针在场) return;

      指针目标.x = x;
      指针目标.y = y;
      const 移动距离 = Math.hypot(x - 上次指针.x, y - 上次指针.y);
      指针强度 = Math.min(1, 指针强度 + 移动距离 * 8 + 0.08);
      上次指针.x = x;
      上次指针.y = y;
    };

    const 绘制光团 = (
      x: number,
      y: number,
      半径: number,
      颜色: readonly [number, number, number],
      透明度: number
    ) => {
      const 渐变 = 上下文.createRadialGradient(x, y, 0, x, y, 半径);
      渐变.addColorStop(
        0,
        `rgba(${颜色[0]}, ${颜色[1]}, ${颜色[2]}, ${透明度})`
      );
      渐变.addColorStop(
        0.38,
        `rgba(${颜色[0]}, ${颜色[1]}, ${颜色[2]}, ${透明度 * 0.52})`
      );
      渐变.addColorStop(1, `rgba(${颜色[0]}, ${颜色[1]}, ${颜色[2]}, 0)`);
      上下文.fillStyle = 渐变;
      上下文.beginPath();
      上下文.arc(x, y, 半径, 0, Math.PI * 2);
      上下文.fill();
    };

    const 绘制 = (当前时间: number) => {
      const 宽度 = 容器.clientWidth;
      const 高度 = 容器.clientHeight;
      const 时间 = 减少动态效果 ? 0 : (当前时间 - 起始时间) / 1000;
      const 缓动 = 指针在场 ? 0.11 : 0.035;

      指针位置.x += (指针目标.x - 指针位置.x) * 缓动;
      指针位置.y += (指针目标.y - 指针位置.y) * 缓动;
      指针强度 *= 指针在场 ? 0.965 : 0.9;

      上下文.clearRect(0, 0, 宽度, 高度);
      上下文.globalCompositeOperation = 'source-over';

      光团配置.forEach((光团, 索引) => {
        const 自动偏移X = Math.sin(时间 * (0.18 + 索引 * 0.035) + 索引) * 0.07;
        const 自动偏移Y = Math.cos(时间 * (0.14 + 索引 * 0.03) + 索引) * 0.055;
        const 距离X = 指针位置.x - 光团.x;
        const 距离Y = 指针位置.y - 光团.y;
        const 牵引 = 指针在场 ? (0.15 + 索引 * 0.018) * (0.45 + 指针强度) : 0;
        const x = (光团.x + 自动偏移X + 距离X * 牵引) * 宽度;
        const y = (光团.y + 自动偏移Y + 距离Y * 牵引) * 高度;
        const 半径 = Math.max(宽度, 高度) * 光团.size;

        绘制光团(x, y, 半径, 光团.color, 索引 === 3 ? 0.08 : 0.18);
      });

      if (指针在场 || 指针强度 > 0.02) {
        const x = 指针位置.x * 宽度;
        const y = 指针位置.y * 高度;
        绘制光团(
          x,
          y,
          Math.max(宽度, 高度) * (0.18 + 指针强度 * 0.08),
          [79, 70, 229],
          0.13 + 指针强度 * 0.12
        );
      }

      动画帧 = requestAnimationFrame(绘制);
    };

    const 尺寸观察器 = new ResizeObserver(调整尺寸);
    尺寸观察器.observe(容器);
    window.addEventListener('pointermove', 记录指针, { passive: true });
    调整尺寸();
    动画帧 = requestAnimationFrame(绘制);

    return () => {
      cancelAnimationFrame(动画帧);
      尺寸观察器.disconnect();
      window.removeEventListener('pointermove', 记录指针);
    };
  }, []);

  return (
    <div className="webtools-flow-field" aria-hidden="true">
      <canvas ref={画布引用} className="webtools-flow-field__canvas" />
      <div className="webtools-flow-field__grid" />
      <div className="webtools-flow-field__fade" />
    </div>
  );
}
