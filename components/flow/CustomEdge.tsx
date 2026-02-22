import { BaseEdge, EdgeProps, getSmoothStepPath } from '@xyflow/react';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: EdgeProps) => {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeStyle = {
    ...style,
    stroke: selected ? '#3b82f6' : (style.stroke as string || '#94a3b8'),
    strokeWidth: selected ? 3 : 2,
  };

  const markerColor = selected ? '#3b82f6' : '#94a3b8';

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={edgeStyle}
      markerEnd={markerEnd ? { ...markerEnd, color: markerColor } : undefined}
    />
  );
};

export default CustomEdge;
