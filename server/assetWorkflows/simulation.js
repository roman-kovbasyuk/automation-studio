import { createHash } from 'node:crypto'
import {
  assetWorkflowDraftSchema,
  simulationFixtureSchema,
} from '../../shared/assetWorkflowContracts.js'
import { capabilityCatalog } from './catalog.js'
import { PublicApiError } from '../routes/support.js'

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    )
  return value
}
export function hashValue(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex')
}
export function semanticHash(draft) {
  const parsed = assetWorkflowDraftSchema.parse(draft)
  return hashValue({
    ...parsed,
    nodes: parsed.nodes
      .map(({ position, ...node }) => node)
      .sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...parsed.edges].sort((a, b) => a.id.localeCompare(b.id)),
  })
}
export function validateDefinition(value) {
  const parsed = assetWorkflowDraftSchema.safeParse(value)
  if (!parsed.success)
    return {
      valid: false,
      issues: parsed.error.issues.map((i) => ({
        code: 'structure',
        message: i.message,
        ...(i.path[0] === 'nodes' &&
        typeof i.path[1] === 'number' &&
        value?.nodes?.[i.path[1]]
          ? { nodeId: value.nodes[i.path[1]].id }
          : {}),
        ...(i.path[0] === 'edges' &&
        typeof i.path[1] === 'number' &&
        value?.edges?.[i.path[1]]
          ? { edgeId: value.edges[i.path[1]].id }
          : {}),
      })),
    }
  const d = parsed.data,
    issues = [],
    nodes = new Map(),
    outgoing = new Map(),
    incoming = new Map(),
    questionIds = new Set()
  const issue = (code, message, nodeId, edgeId) =>
    issues.push({
      code,
      message,
      ...(nodeId ? { nodeId } : {}),
      ...(edgeId ? { edgeId } : {}),
    })
  for (const n of d.nodes) {
    if (nodes.has(n.id))
      issue('duplicate_node', 'Node IDs must be unique', n.id)
    nodes.set(n.id, n)
    outgoing.set(n.id, [])
    incoming.set(n.id, [])
    if (
      !capabilityCatalog.some(
        (c) => c.key === n.capability && c.version === n.version,
      )
    )
      issue('unsupported_capability', 'Capability version is unsupported', n.id)
    const capability = capabilityCatalog.find(
      (c) => c.key === n.capability && c.version === n.version,
    )
    if (capability) {
      for (const binding of Object.keys(n.bindings))
        if (
          !capability.inputContract.includes('*') &&
          !capability.inputContract.includes(binding)
        )
          issue(
            'unsupported_binding',
            'Binding is not supported by this capability',
            n.id,
          )
      for (const binding of capability.requiredBindings)
        if (!n.bindings[binding])
          issue('missing_binding', `Required binding: ${binding}`, n.id)
    }
    for (const q of n.questions)
      if (
        (q.type === 'select' && !q.options.length) ||
        (q.min !== undefined && q.max !== undefined && q.min > q.max)
      )
        issue('question_policy', 'Question options or bounds are invalid', n.id)
    if (
      n.capability === 'condition' &&
      (!n.condition ||
        (n.condition.op !== 'exists' && n.condition.value === undefined))
    )
      issue('condition_required', 'A complete condition is required', n.id)
    if (n.capability !== 'condition' && n.condition)
      issue(
        'unexpected_condition',
        'Only condition nodes accept a condition',
        n.id,
      )
    if (n.capability !== 'clarification' && n.questions.length)
      issue(
        'unexpected_questions',
        'Only clarification nodes accept questions',
        n.id,
      )
    for (const question of n.questions) {
      if (questionIds.has(question.id))
        issue(
          'duplicate_question',
          'Question IDs must be unique across the recipe',
          n.id,
        )
      questionIds.add(question.id)
    }
    if (n.capability === 'output' && !n.outputs.length)
      issue('output_declaration', 'Declare at least one output', n.id)
    if (n.capability === 'output' || n.capability === 'context')
      for (const key of n.outputs)
        if (!n.bindings[key])
          issue('missing_binding', `Output ${key} requires a binding`, n.id)
  }
  const edgeIds = new Set()
  for (const e of d.edges) {
    if (edgeIds.has(e.id))
      issue('duplicate_edge', 'Edge IDs must be unique', undefined, e.id)
    edgeIds.add(e.id)
    if (!nodes.has(e.source) || !nodes.has(e.target)) {
      issue('missing_node', 'Edge endpoint does not exist', undefined, e.id)
      continue
    }
    outgoing.get(e.source).push(e)
    incoming.get(e.target).push(e)
  }
  if (nodes.get(d.entry)?.capability !== 'input')
    issue('entry', 'Entry must identify an Input node', d.entry)
  if (incoming.get(d.entry)?.length)
    issue('entry_incoming', 'Entry cannot have incoming edges', d.entry)
  for (const n of d.nodes) {
    const edges = outgoing.get(n.id)
    if (n.capability === 'condition') {
      if (
        edges.length !== 2 ||
        !edges.some((e) => e.branch === true) ||
        !edges.some((e) => e.branch === false)
      )
        issue(
          'condition_branches',
          'Condition needs exactly one true and one false edge',
          n.id,
        )
    } else if (
      edges.some((e) => e.branch !== undefined) ||
      edges.length > (n.capability === 'output' ? 0 : 1)
    )
      issue(
        'fan_out',
        'Only conditions may branch; outputs must terminate',
        n.id,
      )
    if (n.capability !== 'output' && !edges.length)
      issue('dead_end', 'Every path must terminate in an Output node', n.id)
  }
  const visited = new Set(),
    stack = new Set(),
    order = []
  function visit(id) {
    if (stack.has(id)) {
      issue('cycle', 'Cycles are unsupported', id)
      return
    }
    if (visited.has(id) || !nodes.has(id)) return
    visited.add(id)
    stack.add(id)
    for (const e of outgoing.get(id)) visit(e.target)
    stack.delete(id)
    order.unshift(id)
  }
  visit(d.entry)
  for (const n of d.nodes)
    if (!visited.has(n.id))
      issue('unreachable', 'Node is unreachable from entry', n.id)
  if (!d.nodes.some((n) => n.capability === 'output' && visited.has(n.id)))
    issue('missing_output', 'A reachable Output node is required')
  // Only bindings whose producer dominates the consumer are available on every path.
  const dominators = new Map()
  for (const id of order) {
    const parents = incoming
      .get(id)
      .map((e) => dominators.get(e.source) ?? new Set())
    const common = parents.length
      ? new Set([...parents[0]].filter((x) => parents.every((p) => p.has(x))))
      : new Set()
    const n = nodes.get(id)
    for (const p of [
      ...Object.values(n.bindings),
      ...(n.condition ? [n.condition.path] : []),
      ...n.questions.flatMap((q) => (q.inputPath ? [q.inputPath] : [])),
    ]) {
      if (p === 'nodes') {
        issue(
          'binding_unavailable',
          'Node paths must identify an explicit producer',
          id,
        )
        continue
      }
      if (p.startsWith('nodes.')) {
        const [, source, field] = p.split('.')
        if (!common.has(source))
          issue(
            'binding_unavailable',
            'Binding producer must execute before this node on every path',
            id,
          )
        const producer = nodes.get(source),
          fields =
            producer?.capability === 'clarification'
              ? producer.questions.map((q) => q.id)
              : (producer?.outputs ?? [])
        if (field && !fields.includes(field))
          issue(
            'undeclared_output',
            'Binding references an undeclared producer field',
            id,
          )
      }
    }
    common.add(id)
    dominators.set(id, common)
  }
  return { valid: issues.length === 0, issues }
}
function resolve(state, path) {
  return path
    .split('.')
    .reduce(
      (v, k) =>
        v !== null && typeof v === 'object' && Object.hasOwn(v, k)
          ? v[k]
          : undefined,
      state,
    )
}
function present(v) {
  return v !== undefined && v !== null && v !== ''
}
function checkAnswer(q, answer) {
  if (!present(answer)) return
  const valid =
    q.type === 'number'
      ? typeof answer === 'number' &&
        (q.min === undefined || answer >= q.min) &&
        (q.max === undefined || answer <= q.max)
      : q.type === 'boolean'
        ? typeof answer === 'boolean'
        : typeof answer === 'string' &&
          (q.type !== 'select' || q.options.includes(answer))
  if (!valid)
    throw new PublicApiError(
      400,
      'invalid_answer',
      `Answer does not match the saved question policy: ${q.id}`,
    )
}
export function simulateDefinition(value, fixtureValue) {
  const d = assetWorkflowDraftSchema.parse(value),
    fixture = simulationFixtureSchema.parse(fixtureValue),
    validation = validateDefinition(d)
  if (!validation.valid)
    throw new PublicApiError(
      422,
      'invalid_definition',
      'Recipe is not valid',
      validation.issues,
    )
  const state = {
      input: fixture.input,
      answers: { ...fixture.answers },
      nodes: {},
    },
    trace = [],
    pendingQuestions = []
  let id = d.entry,
    output
  while (id) {
    const n = d.nodes.find((n) => n.id === id),
      entry = { nodeId: id, status: 'completed', simulated: true }
    const bound = Object.fromEntries(
      Object.entries(n.bindings).map(([k, p]) => [
        k,
        resolve(state, p) ?? null,
      ]),
    )
    const capability = capabilityCatalog.find(
      (c) => c.key === n.capability && c.version === n.version,
    )
    if (
      capability.requiredBindings.some((binding) => !present(bound[binding]))
    ) {
      trace.push({ ...entry, status: 'pending' })
      break
    }
    if (n.capability === 'input') state.nodes[id] = state.input
    else if (n.capability === 'clarification') {
      const answers = {}
      for (const q of n.questions) {
        const answer = Object.hasOwn(state.answers, q.id)
          ? state.answers[q.id]
          : q.inputPath
            ? resolve(state, q.inputPath)
            : undefined
        checkAnswer(q, answer)
        if (q.required && !present(answer))
          pendingQuestions.push({ nodeId: id, ...q })
        else if (answer !== undefined) {
          answers[q.id] = answer
          state.answers[q.id] = answer
        }
      }
      state.nodes[id] = answers
      if (pendingQuestions.length) entry.status = 'pending'
    } else if (n.capability === 'ai' || n.capability === 'render') {
      if (!Object.hasOwn(fixture.outputs, id)) entry.status = 'missing_fixture'
      else {
        const value = fixture.outputs[id]
        if (
          value !== null &&
          n.outputs.some(
            (field) =>
              typeof value !== 'object' ||
              !Object.hasOwn(value, field) ||
              !present(value[field]),
          )
        )
          throw new PublicApiError(
            400,
            'invalid_fixture_output',
            `Fixture output is missing declared fields: ${id}`,
          )
        state.nodes[id] = value
      }
    } else if (n.capability === 'condition') {
      const v = resolve(state, n.condition.path)
      entry.decision =
        n.condition.op === 'exists'
          ? present(v)
          : n.condition.op === 'equals'
            ? v === n.condition.value
            : v !== n.condition.value
      state.nodes[id] = entry.decision
    } else {
      state.nodes[id] = bound
      if (n.capability === 'output') {
        if (n.outputs.some((k) => !present(bound[k]))) entry.status = 'pending'
        else output = Object.fromEntries(n.outputs.map((k) => [k, bound[k]]))
      }
    }
    if (Object.hasOwn(state.nodes, id)) entry.output = state.nodes[id]
    trace.push(entry)
    if (entry.status !== 'completed') break
    id = d.edges.find(
      (e) =>
        e.source === id &&
        (n.capability !== 'condition' || e.branch === entry.decision),
    )?.target
  }
  return {
    simulated: true,
    draftHash: semanticHash(d),
    trace,
    pendingQuestions,
    ...(output !== undefined ? { output } : {}),
  }
}
export function seedDefinitions() {
  return [
    ['banners', 'Banner creation'],
    ['presentations', 'Slide deck creation'],
    ['websites', 'Website creation'],
    ['templates', 'Template creation'],
  ].map(([assetType, title]) => {
    const node = (id, capability, extra = {}) => ({
      id,
      capability,
      version: 1,
      label: capability[0].toUpperCase() + capability.slice(1),
      instructions: '',
      config: {},
      bindings: {},
      outputs: [],
      questions: [],
      position: { x: 0, y: 0 },
      ...extra,
    })
    const question = (id, label, type = 'text', extra = {}) => ({
      id,
      label,
      type,
      required: true,
      inputPath: `input.${id}`,
      options: [],
      ...extra,
    })
    const policies = {
      banners: [
        question('channels', 'Which channels will carry the banners?'),
        question(
          'dimensions',
          'Which pixel dimensions and aspect ratios are required?',
        ),
        question(
          'mandatoryCopy',
          'What exact copy, CTA and legal text must appear?',
        ),
      ],
      presentations: [
        question('slideCount', 'How many slides?', 'number', {
          min: 1,
          max: 100,
        }),
        question(
          'textMode',
          'Keep supplied text verbatim or restructure?',
          'select',
          { options: ['verbatim', 'restructure'] },
        ),
        question('audience', 'Who is the audience?'),
      ],
      websites: [
        question('pages', 'Which pages and sections are required?'),
        question('primaryAction', 'What should visitors do?'),
        question(
          'content',
          'What approved content and brand guidance should be used?',
        ),
      ],
      templates: [
        question('format', 'Which template format is required?', 'select', {
          options: ['banner', 'presentation', 'website'],
        }),
        question('editableFields', 'Which fields must remain editable?'),
        question('constraints', 'Which brand and layout rules are fixed?'),
      ],
    }
    const instructions = {
      banners:
        'Plan channel-specific banner variants using exact dimensions. Preserve mandatory copy and legal wording. Describe layout, hierarchy and CTA; do not invent claims.',
      presentations:
        'Plan the requested number of slides for the audience. In verbatim mode preserve supplied wording exactly; in restructure mode organize the source into a coherent slide narrative. Describe content and layout for every slide.',
      websites:
        'Plan the requested pages and sections around the primary visitor action. Use approved content and brand guidance. Describe responsive hierarchy and navigation; do not claim to deploy a site.',
      templates:
        'Plan a reusable template in the selected format. Separate editable fields from fixed brand/layout constraints. Describe field defaults and layout rules; do not claim to export a template.',
    }
    const questions = [
      question('brief', 'What should we create?'),
      ...policies[assetType],
    ]
    const nodes = [
      node('input', 'input', { outputs: questions.map((q) => q.id) }),
      node('context', 'context', {
        bindings: { brief: 'input.brief' },
        outputs: ['brief'],
      }),
      node('clarify', 'clarification', { questions }),
      node('ai', 'ai', {
        instructions: `${instructions[assetType]} This authoring recipe is simulation only.`,
        bindings: { context: 'nodes.context', answers: 'nodes.clarify' },
        outputs: ['plan'],
      }),
      node('condition', 'condition', {
        condition: { path: 'nodes.ai', op: 'exists' },
      }),
      node('render', 'render', {
        bindings: { plan: 'nodes.ai' },
        outputs: ['preview'],
      }),
      node('output', 'output', {
        label: `${title} plan`,
        bindings: { plan: 'nodes.ai' },
        outputs: ['plan'],
      }),
    ]
    nodes.forEach((n, i) => {
      n.position = { x: i * 250, y: 0 }
    })
    const edges = [
      ['input', 'context'],
      ['context', 'clarify'],
      ['clarify', 'ai'],
      ['ai', 'condition'],
      ['condition', 'render', true],
      ['condition', 'output', false],
      ['render', 'output'],
    ].map(([source, target, branch], i) => ({
      id: `edge${i}`,
      source,
      target,
      ...(branch === undefined ? {} : { branch }),
    }))
    return {
      key: assetType,
      assetType,
      title,
      draft: { schemaVersion: 1, entry: 'input', nodes, edges },
    }
  })
}
