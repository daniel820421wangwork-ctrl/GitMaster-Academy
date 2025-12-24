
import React, { useMemo } from 'react';
import { GitState, GitCommit } from '../types';

interface GitGraphProps {
  state: GitState;
}

const GitGraph: React.FC<GitGraphProps> = ({ state }) => {
  const { commits, branches, currentBranch, head } = state;

  const sourceTreePalette = [
    '#3498db', // Blue
    '#2ecc71', // Green
    '#e74c3c', // Red
    '#f1c40f', // Yellow
    '#9b59b6', // Purple
    '#e67e22', // Orange
    '#1abc9c', // Teal
    '#d35400', // Pumpkin
  ];

  const { nodes, paths } = useMemo(() => {
    if (commits.length === 0) return { nodes: [], paths: [] };

    const branchLanes: Record<string, number> = {};
    // Fix: Explicitly cast to string[] to avoid 'unknown' index type error on subsequent forEach
    const uniqueBranches = Array.from(new Set(commits.map(c => c.branch))) as string[];
    uniqueBranches.forEach((b, i) => {
      branchLanes[b] = i;
    });

    const nodeSpacingY = 75; // 增加垂直間距以適應更大的字體
    const nodeSpacingX = 45;
    const paddingLeft = 60;
    const paddingTop = 40;

    const commitNodes = commits.map((c, index) => ({
      ...c,
      x: paddingLeft + (branchLanes[c.branch] || 0) * nodeSpacingX,
      y: paddingTop + index * nodeSpacingY,
      isHead: c.id === head,
      laneIndex: branchLanes[c.branch] || 0
    }));

    const connections: { x1: number, y1: number, x2: number, y2: number, color: string, isMerge: boolean }[] = [];

    commitNodes.forEach(node => {
      if (node.parentId) {
        const parent = commitNodes.find(n => n.id === node.parentId);
        if (parent) {
          connections.push({ 
            x1: parent.x, 
            y1: parent.y, 
            x2: node.x, 
            y2: node.y, 
            color: sourceTreePalette[parent.laneIndex % sourceTreePalette.length],
            isMerge: false 
          });
        }
      }
      if (node.parent2Id) {
        const parent2 = commitNodes.find(n => n.id === node.parent2Id);
        if (parent2) {
          connections.push({ 
            x1: parent2.x, 
            y1: parent2.y, 
            x2: node.x, 
            y2: node.y, 
            color: sourceTreePalette[parent2.laneIndex % sourceTreePalette.length],
            isMerge: true 
          });
        }
      }
    });

    return { nodes: commitNodes, paths: connections };
  }, [commits, head]);

  return (
    <div className="w-full h-full overflow-auto p-0 relative transition-all duration-500 custom-scrollbar">
      <div className="min-w-[600px]">
        <svg width="100%" height={nodes.length * 80 + 150} className="overflow-visible">
          {/* 繪製路徑 */}
          {paths.map((p, i) => (
            <path
              key={i}
              d={`M ${p.x1} ${p.y1} L ${p.x1} ${p.y1 + 35} L ${p.x2} ${p.y2 - 35} L ${p.x2} ${p.y2}`}
              stroke={p.color}
              strokeWidth={p.isMerge ? "2" : "3.5"}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={p.isMerge ? "0.4" : "0.9"}
              className="transition-all duration-700"
            />
          ))}

          {/* 繪製提交點與資訊文字 */}
          {nodes.map((node) => {
            const color = sourceTreePalette[node.laneIndex % sourceTreePalette.length];
            const branchLabels = Object.entries(branches).filter(([name, id]) => id === node.id).map(([name]) => name);

            return (
              <g key={node.id} className="group transition-all duration-300">
                <rect 
                  x="0" 
                  y={node.y - 35} 
                  width="100%" 
                  height="70" 
                  fill="transparent" 
                  className="group-hover:fill-blue-500/5 transition-colors"
                />

                {/* 分支標籤 (最小 14px) */}
                {branchLabels.map((label, lIdx) => (
                  <g key={label} transform={`translate(${node.x + 35}, ${node.y - 18})`}>
                    <rect 
                      x={lIdx * 105} 
                      y="-14" 
                      width="95" 
                      height="26" 
                      rx="6" 
                      fill={label === currentBranch ? "#2563eb" : "#e2e8f0"} 
                      className="dark:fill-slate-800 shadow-sm"
                    />
                    <text 
                      x={lIdx * 105 + 47.5} 
                      y="4" 
                      textAnchor="middle" 
                      className={`text-[14px] font-black pointer-events-none ${label === currentBranch ? 'fill-white' : 'fill-slate-700 dark:fill-slate-300'}`}
                      style={{ fontSize: '14px' }}
                    >
                      {label}
                    </text>
                  </g>
                ))}

                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.isHead ? "8" : "7"}
                  fill={node.isHead ? "#fff" : color}
                  stroke={node.isHead ? color : "#fff"}
                  strokeWidth={node.isHead ? "4" : "2.5"}
                  className="dark:stroke-slate-900 transition-all duration-500"
                />

                {node.isHead && (
                  <circle cx={node.x} cy={node.y} r="14" fill="none" stroke={color} strokeWidth="2" className="animate-pulse" opacity="0.4" />
                )}

                <text x={node.x + 35 + (branchLabels.length * 110)} y={node.y + 6} className="font-sans select-none pointer-events-none">
                  <tspan className="font-mono font-black fill-blue-600 dark:fill-blue-400 opacity-70" style={{ fontSize: '14px' }}>
                    {node.id}
                  </tspan>
                  <tspan className="font-bold fill-slate-800 dark:fill-slate-100" dx="15" style={{ fontSize: '15px' }}>
                    {node.message}
                  </tspan>
                  <tspan className="fill-slate-400 dark:fill-slate-500 font-medium italic" dx="20" style={{ fontSize: '13px' }}>
                    {new Date(node.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>

        {nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[400px] text-slate-300 dark:text-slate-800">
            <i className="fa-solid fa-code-merge text-8xl mb-6 opacity-20"></i>
            <p className="font-black text-sm uppercase tracking-widest opacity-50">初始化儲存庫以顯示動態圖譜</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitGraph;
