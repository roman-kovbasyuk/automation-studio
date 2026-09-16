export function unusedId(prefix, ids) {
  const used = new Set(ids)
  let number = 1
  while (used.has(`${prefix}${number}`)) number++
  return `${prefix}${number}`
}
export function makeNode(capability, nodes) {
  const id = unusedId(
    capability,
    nodes.map((node) => node.id),
  )
  return {
    id,
    capability,
    version: 1,
    label: capability[0].toUpperCase() + capability.slice(1),
    instructions: '',
    config: {},
    bindings: {},
    outputs: [],
    questions: [],
    position: { x: nodes.length * 260, y: 0 },
    ...(capability === 'condition'
      ? { condition: { path: 'input', op: 'exists' } }
      : {}),
  }
}
export function minimalDraft() {
  const input = { ...makeNode('input', []), id: 'input', label: 'Input' }
  const output = {
    ...makeNode('output', [input]),
    id: 'output',
    label: 'Output',
    outputs: ['result'],
    bindings: { result: 'input' },
  }
  return {
    schemaVersion: 1,
    entry: 'input',
    nodes: [input, output],
    edges: [{ id: 'initial', source: 'input', target: 'output' }],
  }
}
export function connectDraft(draft, { source, target, sourceHandle, branch }) {
  if (!source || !target || source === target) return draft
  const node = draft.nodes.find((node) => node.id === source)
  if (!node || !draft.nodes.some((node) => node.id === target)) return draft
  const condition = node.capability === 'condition'
  const edge = {
    id: unusedId(
      'edge',
      draft.edges.map((edge) => edge.id),
    ),
    source,
    target,
    ...(condition ? { branch: branch ?? sourceHandle === 'true' } : {}),
  }
  if (
    draft.edges.some(
      (existing) =>
        existing.source === source &&
        existing.target === target &&
        existing.branch === edge.branch,
    )
  )
    return draft
  return { ...draft, edges: [...draft.edges, edge] }
}
export function removeNodes(draft, ids) {
  return {
    ...draft,
    nodes: draft.nodes.filter((node) => !ids.includes(node.id)),
    edges: draft.edges.filter(
      (edge) => !ids.includes(edge.source) && !ids.includes(edge.target),
    ),
  }
}
export function illustrativeFixture(draft) {
  const answers = {},
    outputs = {}
  for (const node of draft.nodes) {
    for (const question of node.questions)
      answers[question.id] =
        question.type === 'number'
          ? (question.min ?? 1)
          : question.type === 'boolean'
            ? true
            : question.type === 'select'
              ? (question.options[0] ?? '')
              : `Example ${question.label}`
    if (['ai', 'render'].includes(node.capability))
      outputs[node.id] = Object.fromEntries(
        node.outputs.map((name) => [name, `Simulated ${name}`]),
      )
  }
  return { input: { brief: 'Illustrative recipe test' }, answers, outputs }
}
