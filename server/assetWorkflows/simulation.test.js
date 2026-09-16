import { describe, it, expect } from 'vitest'
import {
  assetWorkflowDraftSchema,
  simulationResultSchema,
} from '../../shared/assetWorkflowContracts.js'
import {
  validateDefinition,
  semanticHash,
  simulateDefinition,
  seedDefinitions,
} from './simulation.js'

describe('recipe graph', () => {
  const draft = () => {
    const d = structuredClone(seedDefinitions()[0].draft)
    d.nodes.find((n) => n.id === 'clarify').questions = [
      {
        id: 'brief',
        label: 'What should we create?',
        required: true,
        inputPath: 'input.brief',
      },
    ]
    return d
  }
  it('validates all four seed graphs and ignores positions in execution hash', () => {
    for (const seed of seedDefinitions())
      expect(validateDefinition(seed.draft).valid).toBe(true)
    const a = draft(),
      b = draft()
    b.nodes[0].position.x += 100
    expect(semanticHash(a)).toBe(semanticHash(b))
    b.nodes.find((n) => n.capability === 'ai').instructions += ' Changed'
    expect(semanticHash(a)).not.toBe(semanticHash(b))
  })
  it('rejects unsafe bindings and oversized structures before semantic validation', () => {
    const a = draft()
    a.nodes[1].bindings = { value: 'input.__proto__.secret' }
    expect(assetWorkflowDraftSchema.safeParse(a).success).toBe(false)
    a.nodes[1].bindings = {}
    a.nodes[1].config = { source: 'eval(1)' }
    expect(assetWorkflowDraftSchema.safeParse(a).success).toBe(false)
  })
  it('associates unsupported capabilities, missing branches, cycles and unreachable outputs with nodes/edges', () => {
    const a = draft()
    a.nodes[1].version = 99
    expect(validateDefinition(a).issues).toContainEqual(
      expect.objectContaining({
        nodeId: a.nodes[1].id,
        code: 'unsupported_capability',
      }),
    )
    const b = draft()
    b.edges = b.edges.filter((e) => e.branch !== false)
    expect(
      validateDefinition(b).issues.some((i) => i.code === 'condition_branches'),
    ).toBe(true)
    const c = draft()
    c.edges.push({ id: 'cycle', source: 'output', target: 'input' })
    expect(validateDefinition(c).valid).toBe(false)
    const d = draft()
    d.edges = d.edges.filter((e) => e.target !== 'output')
    expect(
      validateDefinition(d).issues.some((i) => i.nodeId === 'output'),
    ).toBe(true)
  })
  it('asks saved required questions, consumes supplied answers once and simulates both branches', () => {
    const a = draft()
    const pending = simulateDefinition(a, {
      input: {},
      answers: {},
      outputs: {},
    })
    expect(pending.pendingQuestions.map((q) => q.id)).toEqual(['brief'])
    const result = simulateDefinition(a, {
      input: {},
      answers: { brief: 'A campaign' },
      outputs: { ai: { plan: 'Fixture' }, render: { preview: 'fixture' } },
    })
    expect(result.simulated).toBe(true)
    expect(result.pendingQuestions).toEqual([])
    expect(result.trace.find((t) => t.nodeId === 'condition').decision).toBe(
      true,
    )
    expect(result.trace.find((t) => t.nodeId === 'render').simulated).toBe(true)
    const other = simulateDefinition(a, {
      input: { brief: 'Ready' },
      answers: {},
      outputs: { ai: null },
    })
    expect(other.trace.find((t) => t.nodeId === 'condition').decision).toBe(
      false,
    )
    expect(other.trace.some((t) => t.nodeId === 'render')).toBe(false)
  })
  it('rejects references to unavailable branch outputs and unsupported conditions', () => {
    const a = draft()
    a.nodes.find((n) => n.id === 'output').bindings = { asset: 'nodes.render' }
    expect(
      validateDefinition(a).issues.some(
        (i) => i.code === 'binding_unavailable',
      ),
    ).toBe(true)
    const b = draft()
    b.nodes.find((n) => n.id === 'condition').condition.op = 'execute'
    expect(assetWorkflowDraftSchema.safeParse(b).success).toBe(false)
  })
  it('rejects undeclared producer fields and incompatible capability binding slots', () => {
    const a = draft()
    a.nodes.find((n) => n.id === 'render').bindings = {
      plan: 'nodes.ai.undeclared',
    }
    expect(
      validateDefinition(a).issues.some((i) => i.code === 'undeclared_output'),
    ).toBe(true)
    const b = draft()
    b.nodes.find((n) => n.id === 'render').bindings = { arbitrary: 'nodes.ai' }
    expect(
      validateDefinition(b).issues.some(
        (i) => i.code === 'unsupported_binding',
      ),
    ).toBe(true)
  })
  it('validates question types/options and never completes an absent terminal output', () => {
    const a = draft()
    a.nodes.find((n) => n.id === 'clarify').questions = [
      {
        id: 'count',
        label: 'Count',
        required: true,
        type: 'number',
        min: 1,
        max: 30,
      },
    ]
    expect(() =>
      simulateDefinition(a, { answers: { count: 'many' }, outputs: {} }),
    ).toThrow('Answer')
    expect(() =>
      simulateDefinition(a, { answers: { count: 31 }, outputs: {} }),
    ).toThrow('Answer')
    a.nodes.find((n) => n.id === 'clarify').questions = [
      {
        id: 'mode',
        label: 'Mode',
        required: true,
        type: 'select',
        options: ['verbatim', 'restructure'],
      },
    ]
    expect(() =>
      simulateDefinition(a, { answers: { mode: 'other' }, outputs: {} }),
    ).toThrow('Answer')
    const b = draft()
    b.nodes.find((n) => n.id === 'clarify').questions = []
    const result = simulateDefinition(b, { outputs: { ai: null } })
    expect(result.trace.at(-1).status).toBe('pending')
  })
  it('rejects fixture output that does not satisfy declared fields', () => {
    const a = draft()
    expect(() =>
      simulateDefinition(a, {
        input: { brief: 'Ready' },
        outputs: { ai: { unexpected: 'value' } },
      }),
    ).toThrow('Fixture output')
  })
  it('requires declared context fields to have bindings and associates malformed edges correctly', () => {
    const a = draft()
    a.nodes.find((n) => n.id === 'context').outputs.push('missing')
    expect(validateDefinition(a).issues).toContainEqual(
      expect.objectContaining({ code: 'missing_binding', nodeId: 'context' }),
    )
    const b = draft()
    b.edges[0].branch = 'not-a-boolean'
    expect(validateDefinition(b).issues).toContainEqual(
      expect.objectContaining({ code: 'structure', edgeId: 'edge0' }),
    )
  })
  it('rejects aggregate nodes references in bindings, conditions and question paths', () => {
    for (const change of [
      (d) => {
        d.nodes.find((n) => n.id === 'context').bindings.brief = 'nodes'
      },
      (d) => {
        d.nodes.find((n) => n.id === 'condition').condition.path = 'nodes'
      },
      (d) => {
        d.nodes.find((n) => n.id === 'clarify').questions[0].inputPath = 'nodes'
      },
    ]) {
      const d = draft()
      change(d)
      expect(validateDefinition(d).issues).toContainEqual(
        expect.objectContaining({ code: 'binding_unavailable' }),
      )
      expect(() =>
        simulateDefinition(d, {
          input: { brief: 'Brief' },
          outputs: { ai: { plan: 'Plan' }, render: { preview: 'Preview' } },
        }),
      ).toThrow('Recipe is not valid')
    }
  })
  it.each(['nodes.ai', 'input.missingPlan'])(
    'stops render when required %s resolves null or missing',
    (binding) => {
      const d = draft()
      d.nodes = d.nodes.filter((n) => n.id !== 'condition')
      d.nodes.find((n) => n.id === 'render').bindings.plan = binding
      d.nodes.find((n) => n.id === 'output').bindings.plan =
        'nodes.render.preview'
      d.edges = d.edges.filter(
        (e) => e.source !== 'condition' && e.target !== 'condition',
      )
      d.edges.push({ id: 'ai-render', source: 'ai', target: 'render' })
      expect(validateDefinition(d).valid).toBe(true)
      const result = simulateDefinition(d, {
        input: { brief: 'Brief' },
        outputs: { ai: null, render: { preview: 'Should not be used' } },
      })
      expect(result.trace.at(-1)).toEqual({
        nodeId: 'render',
        status: 'pending',
        simulated: true,
      })
      expect(result).not.toHaveProperty('output')
      expect(simulationResultSchema.safeParse(result).success).toBe(true)
    },
  )
  it('rejects question IDs reused by another clarification node', () => {
    const d = draft()
    d.nodes.push({
      ...structuredClone(d.nodes.find((n) => n.id === 'clarify')),
      id: 'clarify-again',
    })
    d.edges.find((e) => e.source === 'clarify').target = 'clarify-again'
    d.edges.push({ id: 'again-ai', source: 'clarify-again', target: 'ai' })
    expect(validateDefinition(d).issues).toContainEqual(
      expect.objectContaining({
        code: 'duplicate_question',
        nodeId: 'clarify-again',
      }),
    )
  })
  it('normalizes typed inputPath answers for later conditions without asking again', () => {
    const d = draft()
    d.nodes.find((n) => n.id === 'clarify').questions = [
      {
        id: 'textMode',
        label: 'Text mode',
        required: true,
        type: 'select',
        options: ['verbatim', 'restructure'],
        inputPath: 'input.textMode',
      },
    ]
    d.nodes.find((n) => n.id === 'condition').condition = {
      path: 'answers.textMode',
      op: 'equals',
      value: 'verbatim',
    }
    const fixture = {
      input: { textMode: 'verbatim' },
      answers: {},
      outputs: { ai: { plan: 'Plan' }, render: { preview: 'Preview' } },
    }
    const result = simulateDefinition(d, fixture)
    expect(result.trace.find((t) => t.nodeId === 'condition').decision).toBe(
      true,
    )
    expect(result.pendingQuestions).toEqual([])
    expect(fixture.answers).toEqual({})
    expect(simulationResultSchema.safeParse(result).success).toBe(true)
  })
})
