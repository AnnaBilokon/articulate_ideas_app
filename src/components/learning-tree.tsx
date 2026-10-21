import { growTree, type Leaf } from "@/lib/tree";

// The learning tree: a leaf for every day with learning and a fruit for every
// learned topic. Today's leaf pops in once something is recalled today;
// before that, a dotted bud shows where it will grow.
export function LearningTree({
  days,
  topics,
  learnedToday,
  className,
}: {
  days: number;
  topics: number;
  learnedToday: boolean;
  className?: string;
}) {
  const tree = growTree(days, topics);
  const { base } = tree;
  const newest = learnedToday ? tree.leaves.length - 1 : -1;
  const bud = !learnedToday ? tree.nextLeaf : null;

  // Frame the tree as it is now: a young tree fills the card, and the view
  // widens as it grows. Points are scaled around the base, like the drawing.
  const tops = [...tree.branches.map((b) => b.to.y), ...tree.leaves.map((l) => l.y), ...(bud ? [bud.y] : [])];
  const highest = tops.length > 0 ? base.y + (Math.min(...tops) - base.y) * tree.scale : base.y - 20;
  const top = Math.min(120, Math.max(0, highest - 22));
  const height = 215 - top;
  const width = (height * 240) / 215;

  return (
    <svg
      viewBox={`${base.x - width / 2} ${top} ${width} ${height}`}
      className={className}
      role="img"
      aria-label={`Your learning tree: ${days} learning ${days === 1 ? "day" : "days"} as leaves, ${topics} learned ${topics === 1 ? "topic" : "topics"} as fruit.`}
    >
      <ellipse cx={base.x} cy={base.y + 5} rx={95} ry={11} fill="var(--tree-ground)" />
      {days === 0 && <ellipse cx={base.x} cy={base.y - 1} rx={6} ry={4} fill="var(--tree-trunk)" />}
      <g className="tree-sway">
        <g transform={`translate(${base.x} ${base.y}) scale(${tree.scale}) translate(${-base.x} ${-base.y})`}>
          {tree.branches.map((b) => (
            <line
              key={b.order}
              x1={b.from.x}
              y1={b.from.y}
              x2={b.from.x + (b.to.x - b.from.x) * b.grown}
              y2={b.from.y + (b.to.y - b.from.y) * b.grown}
              stroke="var(--tree-trunk)"
              strokeWidth={b.width}
              strokeLinecap="round"
            />
          ))}
          {tree.leaves.map((leaf, i) => (
            <LeafShape key={i} leaf={leaf} size={tree.leafScale} fresh={i === newest} />
          ))}
          {tree.fruit.map((f, i) => (
            <circle key={i} cx={f.x} cy={f.y + 3} r={4.2} fill="var(--tree-fruit)" />
          ))}
          {bud && (
            <g transform={`rotate(${bud.angle} ${bud.x} ${bud.y})`}>
              <ellipse
                cx={bud.x}
                cy={bud.y}
                rx={5.5 * tree.leafScale}
                ry={3 * tree.leafScale}
                fill="none"
                stroke="var(--tree-leaf)"
                strokeWidth={1}
                strokeDasharray="2 1.5"
              />
            </g>
          )}
        </g>
      </g>
    </svg>
  );
}

function LeafShape({ leaf, size, fresh }: { leaf: Leaf; size: number; fresh: boolean }) {
  return (
    <g transform={`rotate(${leaf.angle} ${leaf.x} ${leaf.y})`}>
      <ellipse
        cx={leaf.x}
        cy={leaf.y}
        rx={5.5 * size}
        ry={3 * size}
        fill={fresh ? "var(--tree-leaf-new)" : leaf.tone ? "var(--tree-leaf-2)" : "var(--tree-leaf)"}
        className={fresh ? "tree-new-leaf" : undefined}
      />
    </g>
  );
}
