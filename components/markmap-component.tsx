'use client'

import React, { useEffect, useRef } from 'react';
import { Markmap } from 'markmap-view';
import { Transformer } from 'markmap-lib';
import { IMarkmapOptions, INode } from 'markmap-common';

interface MarkmapState {
  id: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  scale: number;
  x: number;
  y: number;
}

interface MarkmapInstance extends Markmap {
  setPosition(x: number, y: number): void;
  state: MarkmapState;
  fit(): Promise<void>;
  rescale(scale: number): Promise<void>;
  setData(data: any): void;
  destroy(): void;
}

interface MarkmapProps {
  markdown: string;
  taskId?: string;
}

const MarkmapComponent: React.FC<MarkmapProps> = ({ markdown, taskId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const mmRef = useRef<MarkmapInstance | null>(null);
  const scaleRef = useRef(1);

  useEffect(() => {
    if (svgRef.current && markdown) {
      try {
        if (svgRef.current) {
          svgRef.current.innerHTML = '';
        }
        
        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);

        const options: IMarkmapOptions = {
          embedGlobalCSS: true,
          scrollForPan: true,
          pan: true,
          zoom: true,
          nodeMinHeight: 16,
          paddingX: 20,
          spacingHorizontal: 100,
          spacingVertical: 5,
          initialExpandLevel: -1,
          maxInitialScale: 1,
          duration: 500,
          maxWidth: 300,
          toggleRecursively: true,
          autoFit: true,
          fitRatio: 0.95,
          color: (node: INode & { depth?: number }) => {
            const colors = ['#90caf9', '#a5d6a7', '#ffcc80', '#ef9a9a'];
            return colors[(node.depth || 0) % colors.length];
          },
        };

        mmRef.current = Markmap.create(svgRef.current, options, root) as unknown as MarkmapInstance;

        requestAnimationFrame(() => {
          const mm = mmRef.current;
          if (mm) {
            mm.fit();
            mm.rescale(scaleRef.current);
            mm.setData(root as any);
          }
        });

        const svg = svgRef.current;
        svg.style.backgroundColor = 'transparent';
        
        const textElements = svg.getElementsByTagName('text');
        for (let i = 0; i < textElements.length; i++) {
          textElements[i].style.fill = '#ffffff';
        }

        const pathElements = svg.getElementsByTagName('path');
        for (let i = 0; i < pathElements.length; i++) {
          pathElements[i].style.stroke = '#ffffff80';
        }

        const handleWheel = (e: WheelEvent) => {
          e.preventDefault();
          const mm = mmRef.current;
          if (!mm) return;

          const scaleStep = 0.05;
          const delta = -e.deltaY / Math.abs(e.deltaY);
          const scaleFactor = 1 + (delta * scaleStep);
          scaleRef.current *= scaleFactor;
          scaleRef.current = Math.min(Math.max(scaleRef.current, 0.2), 3);

          requestAnimationFrame(() => {
            if (mm) {
              mm.rescale(scaleRef.current);
              if (scaleRef.current <= 0.3) {
                requestAnimationFrame(() => {
                  if (mm) {
                    mm.fit();
                    scaleRef.current = mm.state.scale;
                  }
                });
              }
            }
          });
        };

        let isDragging = false;
        let lastX = 0;
        let lastY = 0;

        const handleMouseDown = (e: MouseEvent) => {
          isDragging = true;
          lastX = e.clientX;
          lastY = e.clientY;
          svg.style.cursor = 'grabbing';
        };

        const handleMouseMove = (e: MouseEvent) => {
          const mm = mmRef.current;
          if (!isDragging || !mm) return;
          
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          lastX = e.clientX;
          lastY = e.clientY;

          const { x, y } = mm.state;
          mm.setPosition(x + dx, y + dy);
        };

        const handleMouseUp = () => {
          isDragging = false;
          svg.style.cursor = 'grab';
        };

        svg.addEventListener('wheel', handleWheel, { passive: false });
        svg.addEventListener('mousedown', handleMouseDown);
        svg.addEventListener('mousemove', handleMouseMove);
        svg.addEventListener('mouseup', handleMouseUp);
        svg.addEventListener('mouseleave', handleMouseUp);
        
        svg.style.cursor = 'grab';

        return () => {
          svg.removeEventListener('wheel', handleWheel);
          svg.removeEventListener('mousedown', handleMouseDown);
          svg.removeEventListener('mousemove', handleMouseMove);
          svg.removeEventListener('mouseup', handleMouseUp);
          svg.removeEventListener('mouseleave', handleMouseUp);
          if (mmRef.current) {
            mmRef.current.destroy();
            mmRef.current = null;
          }
        };
      } catch (error) {
        console.error('渲染思维导图失败:', error);
      }
    }
  }, [markdown]);

  return (
    <div className="w-full min-h-[500px] bg-transparent rounded-lg p-4" data-task-id={taskId}>
      <svg 
        ref={svgRef} 
        className="w-full h-[500px]"
        style={{
          background: 'transparent',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      />
    </div>
  );
};

export default MarkmapComponent;