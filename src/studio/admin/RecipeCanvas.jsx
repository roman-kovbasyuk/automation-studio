import { useMemo } from 'react'
import { Surface } from 'brutalist-design-system'
import { StatusBadge } from "../../components/design-system/compatibility.jsx"
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { connectDraft, removeNodes } from './recipeGraph.js'
function RecipeNode({ data, selected }) {
  const { node, invalid } = data
  return (
    <Surface><div className="admin-flow-node">
      {invalid ? <StatusBadge tone="danger">Needs attention</StatusBadge> : selected ? <StatusBadge tone="info">Selected</StatusBadge> : null}
      <Handle type="target" position={Position.Left} />
      <span className="admin-node-capability">{node.capability}</span>
      <strong>{node.label}</strong>
      {node.questions.length > 0 && (
        <span className="admin-node-detail">{node.questions.length} questions</span>
      )}
      {node.capability === 'condition' ? (
        <>
          <span className="admin-branch-label">True / False</span>
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: '35%' }}
          />
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: '75%' }}
          />
        </>
      ) : (
        <Handle type="source" position={Position.Right} />
      )}
    </div></Surface>
  )
}
const nodeTypes = { recipe: RecipeNode }
export function RecipeCanvas({
  draft,
  selected,
  onSelect,
  onChange,
  busy,
  issues,
}) {
  const nodes = useMemo(
    () =>
      draft.nodes.map((node) => ({
        id: node.id,
        type: 'recipe',
        position: node.position,
        data: {
          node,
          invalid: issues.some((issue) => issue.nodeId === node.id),
        },
        selected: node.id === selected,
      })),
    [draft.nodes, selected, issues],
  )
  const edges = useMemo(
    () =>
      draft.edges.map((edge) => ({
        ...edge,
        sourceHandle:
          typeof edge.branch === 'boolean' ? String(edge.branch) : undefined,
        label:
          typeof edge.branch === 'boolean'
            ? edge.branch
              ? 'True'
              : 'False'
            : undefined,
        markerEnd: { type: MarkerType.ArrowClosed },
        className: issues.some((issue) => issue.edgeId === edge.id)
          ? 'admin-invalid-edge'
          : undefined,
      })),
    [draft.edges, issues],
  )
  return (
    <div className="admin-canvas" aria-label="Recipe workflow canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.8}
        nodesDraggable={!busy}
        nodesConnectable={!busy}
        deleteKeyCode={busy ? null : ['Backspace', 'Delete']}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect('')}
        onNodesChange={(changes) => {
          if (busy) return
          const removed = changes
            .filter((change) => change.type === 'remove')
            .map((change) => change.id)
          let next = removed.length ? removeNodes(draft, removed) : draft
          if (next.nodes.length === 0) return
          const positions = changes.filter(
            (change) => change.type === 'position' && change.position,
          )
          if (positions.length)
            next = {
              ...next,
              nodes: next.nodes.map((node) => {
                const position = positions.find(
                  (change) => change.id === node.id,
                )?.position
                return position ? { ...node, position } : node
              }),
            }
          const selection = changes.find(
            (change) => change.type === 'select' && change.selected,
          )
          if (selection) onSelect(selection.id)
          if (removed.includes(selected)) onSelect('')
          if (next !== draft) onChange(next)
        }}
        onEdgesChange={(changes) => {
          if (busy) return
          const removed = changes
            .filter((change) => change.type === 'remove')
            .map((change) => change.id)
          if (removed.length)
            onChange({
              ...draft,
              edges: draft.edges.filter((edge) => !removed.includes(edge.id)),
            })
        }}
        onConnect={(connection) => {
          if (!busy) onChange(connectDraft(draft, connection))
        }}
      >
        <Background gap={24} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
