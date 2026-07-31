'use client';

import { useEffect, useRef } from 'react';

type 坐标 = {
  x: number;
  y: number;
};

type 烟雾粒子 = 坐标 & {
  vx: number;
  vy: number;
  radius: number;
  life: number;
  age: number;
  alpha: number;
  color: readonly [number, number, number];
  phase: number;
};

const 光团配置 = [
  { x: 0.2, y: 0.32, size: 0.42, color: [94, 106, 210] },
  { x: 0.76, y: 0.24, size: 0.38, color: [122, 127, 173] },
  { x: 0.6, y: 0.78, size: 0.34, color: [98, 102, 109] },
  { x: 0.36, y: 0.68, size: 0.25, color: [138, 143, 152] },
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
    const 流体位移: 坐标 = { x: 0, y: 0 };
    const 流体速度: 坐标 = { x: 0, y: 0 };
    const 烟雾粒子组: 烟雾粒子[] = [];
    let 指针强度 = 0;
    let 指针在场 = false;
    let 动画帧 = 0;
    const 起始时间 = performance.now();
    let 上一帧时间 = 起始时间;
    let 上次指针时间 = 起始时间;

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

      const 当前时间 = performance.now();
      const 间隔 = Math.max(16, 当前时间 - 上次指针时间);
      const 变化X = x - 上次指针.x;
      const 变化Y = y - 上次指针.y;
      const 移动距离 = Math.hypot(变化X, 变化Y);
      const 速度X = (变化X / 间隔) * 16;
      const 速度Y = (变化Y / 间隔) * 16;

      指针目标.x = x;
      指针目标.y = y;
      指针强度 = Math.min(1, 指针强度 + 移动距离 * 8 + 0.08);
      流体速度.x += 速度X * 0.85;
      流体速度.y += 速度Y * 0.85;

      if (移动距离 > 0.002) {
        const 粒子数量 = Math.min(7, Math.max(2, Math.ceil(移动距离 * 42)));
        for (let 索引 = 0; 索引 < 粒子数量; 索引 += 1) {
          const 进度 = 索引 / 粒子数量;
          const 扩散 = (Math.random() - 0.5) * 0.025;
          烟雾粒子组.push({
            x: 上次指针.x + 变化X * 进度 + 扩散,
            y: 上次指针.y + 变化Y * 进度 + 扩散,
            vx: 速度X * (0.7 + Math.random() * 0.55) + 扩散 * 0.12,
            vy:
              速度Y * (0.7 + Math.random() * 0.55) -
              (0.0007 + Math.random() * 0.0016),
            radius: 0.035 + Math.random() * 0.045,
            life: 1500 + Math.random() * 1700,
            age: 0,
            alpha: 0.05 + Math.random() * 0.08,
            color: 索引 % 3 === 0 ? [122, 127, 173] : [94, 106, 210],
            phase: Math.random() * Math.PI * 2,
          });
        }
      }

      if (烟雾粒子组.length > 90) {
        烟雾粒子组.splice(0, 烟雾粒子组.length - 90);
      }

      上次指针.x = x;
      上次指针.y = y;
      上次指针时间 = 当前时间;
    };

    const 处理指针离开 = (事件: PointerEvent) => {
      const 边界 = 容器.getBoundingClientRect();
      指针在场 =
        事件.clientX >= 边界.left &&
        事件.clientX <= 边界.right &&
        事件.clientY >= 边界.top &&
        事件.clientY <= 边界.bottom;
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
      const 帧间隔 = Math.min(32, 当前时间 - 上一帧时间);
      const 帧倍率 = 帧间隔 / 16;
      const 缓动 = 指针在场 ? 0.11 : 0.035;
      上一帧时间 = 当前时间;

      指针位置.x += (指针目标.x - 指针位置.x) * 缓动;
      指针位置.y += (指针目标.y - 指针位置.y) * 缓动;
      指针强度 *= 0.955;
      流体位移.x += 流体速度.x * 帧倍率;
      流体位移.y += 流体速度.y * 帧倍率;
      流体速度.x *= 0.94;
      流体速度.y = 流体速度.y * 0.94 - 0.000003 * 帧间隔;
      流体位移.x *= 0.985;
      流体位移.y *= 0.985;

      上下文.clearRect(0, 0, 宽度, 高度);
      上下文.globalCompositeOperation = 'source-over';

      光团配置.forEach((光团, 索引) => {
        const 自动偏移X = Math.sin(时间 * (0.18 + 索引 * 0.035) + 索引) * 0.07;
        const 自动偏移Y = Math.cos(时间 * (0.14 + 索引 * 0.03) + 索引) * 0.055;
        const 惯性倍率 = 0.34 - 索引 * 0.045;
        const x = (光团.x + 自动偏移X + 流体位移.x * 惯性倍率) * 宽度;
        const y = (光团.y + 自动偏移Y + 流体位移.y * 惯性倍率) * 高度;
        const 半径 = Math.max(宽度, 高度) * 光团.size;

        绘制光团(x, y, 半径, 光团.color, 索引 === 3 ? 0.04 : 0.11);
      });

      上下文.globalCompositeOperation = 'screen';
      for (let 索引 = 烟雾粒子组.length - 1; 索引 >= 0; 索引 -= 1) {
        const 粒子 = 烟雾粒子组[索引];
        粒子.age += 帧间隔;
        if (粒子.age >= 粒子.life) {
          烟雾粒子组.splice(索引, 1);
          continue;
        }

        const 生命进度 = 粒子.age / 粒子.life;
        粒子.vx *= 0.991;
        粒子.vy = 粒子.vy * 0.991 - 0.0000018 * 帧间隔;
        粒子.x +=
          粒子.vx * 帧倍率 +
          Math.sin(时间 * 1.25 + 粒子.phase) * 0.000045 * 帧间隔;
        粒子.y +=
          粒子.vy * 帧倍率 +
          Math.cos(时间 * 0.9 + 粒子.phase) * 0.000025 * 帧间隔;

        const 淡出 = Math.pow(1 - 生命进度, 1.65);
        绘制光团(
          粒子.x * 宽度,
          粒子.y * 高度,
          Math.max(宽度, 高度) * 粒子.radius * (1 + 生命进度 * 2.4),
          粒子.color,
          粒子.alpha * 淡出
        );
      }

      if (指针在场 && 指针强度 > 0.02) {
        const x = 指针位置.x * 宽度;
        const y = 指针位置.y * 高度;
        绘制光团(
          x,
          y,
          Math.max(宽度, 高度) * (0.1 + 指针强度 * 0.045),
          [94, 106, 210],
          0.035 + 指针强度 * 0.055
        );
      }

      动画帧 = requestAnimationFrame(绘制);
    };

    const 尺寸观察器 = new ResizeObserver(调整尺寸);
    尺寸观察器.observe(容器);
    window.addEventListener('pointermove', 记录指针, { passive: true });
    window.addEventListener('pointerleave', 处理指针离开, { passive: true });
    调整尺寸();
    动画帧 = requestAnimationFrame(绘制);

    return () => {
      cancelAnimationFrame(动画帧);
      尺寸观察器.disconnect();
      window.removeEventListener('pointermove', 记录指针);
      window.removeEventListener('pointerleave', 处理指针离开);
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
