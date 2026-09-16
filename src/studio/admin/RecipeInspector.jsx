import { useState } from 'react'
import { FormField } from '../../components/design-system/molecules/FormField.jsx'
import {
  InspectorPanel,
  TextArea,
  SelectField,
  CheckboxField,
} from '../../components/design-system/organisms/OperationsLayout.jsx'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { options } from './adminShared.jsx'
import { unusedId } from './recipeGraph.js'
const scalarType = (value) => (value === null ? 'null' : typeof value)
export function RecipeInspector({
  node,
  connections,
  draft,
  onChange,
  onDelete,
  onClose,
  busy,
}) {
  const [bindingError, setBindingError] = useState(null)
  if (!node) return null
  const patch = (value) => onChange({ ...node, ...value })
  const question = (index, values) =>
    patch({
      questions: node.questions.map((item, i) =>
        i === index ? { ...item, ...values } : item,
      ),
    })
  const binding = (index, key, value) => {
    const pairs = Object.entries(node.bindings)
    if (pairs.some(([name], i) => i !== index && name === key)) {
      setBindingError({
        nodeId: node.id,
        index,
        message: `A binding named “${key}” already exists. Choose a different name.`,
      })
      return
    }
    setBindingError(null)
    pairs[index] = [key, value]
    patch({ bindings: Object.fromEntries(pairs) })
  }
  const condition = (values) =>
    patch({ condition: { ...node.condition, ...values } })
  return (
    <InspectorPanel className="admin-inspector" aria-label="Node settings">
      <div className="admin-inspector-heading">
        <h2>Node settings</h2>
        <AppButton size="compact" onClick={onClose}>
          Close settings
        </AppButton>
      </div>
      <p className="admin-muted">
        {node.capability} · {node.id} · capability v{node.version}
      </p>
      <fieldset disabled={busy}>
        <FormField
          label="Label"
          maxLength={160}
          value={node.label}
          onChange={(e) => patch({ label: e.target.value })}
        />
        <TextArea
          label={node.capability === 'ai' ? 'AI instructions' : 'Instructions'}
          rows={5}
          maxLength={20000}
          value={node.instructions}
          onChange={(e) => patch({ instructions: e.target.value })}
        />
        {node.capability === 'input' && (
          <CheckboxField
            label="Recipe entry node"
            checked={draft.entry === node.id}
            onChange={() => onChange(node, { entry: node.id })}
          />
        )}
        {node.capability === 'condition' && (
          <section>
            <h3>Condition</h3>
            <FormField
              label="Condition path"
              hint="For example answers.textMode or nodes.ai.plan"
              value={node.condition?.path || ''}
              onChange={(e) => condition({ path: e.target.value })}
            />
            <SelectField
              label="Condition operator"
              options={[
                { value: 'exists', label: 'Exists' },
                { value: 'equals', label: 'Equals' },
                { value: 'notEquals', label: 'Does not equal' },
              ]}
              value={node.condition?.op || 'exists'}
              onChange={(e) =>
                condition(
                  e.target.value === 'exists'
                    ? { op: e.target.value, value: undefined }
                    : {
                        op: e.target.value,
                        value: node.condition?.value ?? '',
                      },
                )
              }
            />
            {node.condition?.op !== 'exists' && (
              <>
                <SelectField
                  label="Comparison value type"
                  options={options(['string', 'number', 'boolean', 'null'])}
                  value={scalarType(
                    node.condition?.value === undefined
                      ? ''
                      : node.condition.value,
                  )}
                  onChange={(e) =>
                    condition({
                      value: {
                        string: '',
                        number: 0,
                        boolean: false,
                        null: null,
                      }[e.target.value],
                    })
                  }
                />
                {node.condition?.value === null ? (
                  <p>Compared with null.</p>
                ) : typeof node.condition?.value === 'boolean' ? (
                  <CheckboxField
                    label="Comparison value"
                    checked={node.condition.value}
                    onChange={(e) => condition({ value: e.target.checked })}
                  />
                ) : (
                  <FormField
                    label="Comparison value"
                    type={
                      typeof node.condition?.value === 'number'
                        ? 'number'
                        : 'text'
                    }
                    value={node.condition?.value ?? ''}
                    onChange={(e) =>
                      condition({
                        value:
                          typeof node.condition?.value === 'number'
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
              </>
            )}
          </section>
        )}
        {node.capability === 'clarification' && (
          <section>
            <h3>Questions</h3>
            {node.questions.map((item, index) => (
              <div className="admin-question" key={index}>
                <h4>Question {index + 1}</h4>
                <FormField
                  label={`Question ${index + 1} ID`}
                  value={item.id}
                  onChange={(e) => question(index, { id: e.target.value })}
                />
                <FormField
                  label={`Question ${index + 1} label`}
                  value={item.label}
                  onChange={(e) => question(index, { label: e.target.value })}
                />
                <SelectField
                  label={`Question ${index + 1} type`}
                  options={options(['text', 'number', 'select', 'boolean'])}
                  value={item.type || 'text'}
                  onChange={(e) => question(index, { type: e.target.value })}
                />
                <CheckboxField
                  label={`Question ${index + 1} required`}
                  checked={item.required}
                  onChange={(e) =>
                    question(index, { required: e.target.checked })
                  }
                />
                <FormField
                  label={`Question ${index + 1} input path`}
                  hint="Optional: reuse an existing input answer."
                  value={item.inputPath || ''}
                  onChange={(e) =>
                    question(index, { inputPath: e.target.value || undefined })
                  }
                />
                {item.type === 'number' && (
                  <div className="admin-field-pair">
                    <FormField
                      label={`Question ${index + 1} minimum`}
                      type="number"
                      value={item.min ?? ''}
                      onChange={(e) =>
                        question(index, {
                          min:
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                    <FormField
                      label={`Question ${index + 1} maximum`}
                      type="number"
                      value={item.max ?? ''}
                      onChange={(e) =>
                        question(index, {
                          max:
                            e.target.value === ''
                              ? undefined
                              : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}
                {item.type === 'select' && (
                  <TextArea
                    label={`Question ${index + 1} options`}
                    instructions="One choice per line."
                    value={item.options.join('\n')}
                    onChange={(e) =>
                      question(index, { options: e.target.value.split('\n') })
                    }
                  />
                )}
                <AppButton
                  onClick={() =>
                    patch({
                      questions: node.questions.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove question {index + 1}
                </AppButton>
              </div>
            ))}
            <AppButton
              disabled={node.questions.length >= 30}
              onClick={() =>
                patch({
                  questions: [
                    ...node.questions,
                    {
                      id: unusedId(
                        'question',
                        draft.nodes.flatMap((n) =>
                          n.questions.map((q) => q.id),
                        ),
                      ),
                      label: 'New question',
                      type: 'text',
                      required: true,
                      options: [],
                    },
                  ],
                })
              }
            >
              Add question
            </AppButton>
          </section>
        )}
        {['context', 'ai', 'render', 'output'].includes(node.capability) && (
          <section>
            <h3>Bindings</h3>
            <p className="admin-muted">
              Bind named inputs to input, answers, or an earlier node’s output.
            </p>
            {Object.entries(node.bindings).map(([key, value], index) => (
              <div key={index} className="admin-binding">
                <FormField
                  label={`Binding ${index + 1} name`}
                  error={
                    bindingError?.nodeId === node.id &&
                    bindingError.index === index
                      ? bindingError.message
                      : undefined
                  }
                  value={key}
                  onChange={(e) => binding(index, e.target.value, value)}
                />
                <FormField
                  label={`Binding ${index + 1} path`}
                  value={value}
                  onChange={(e) => binding(index, key, e.target.value)}
                />
                <AppButton
                  onClick={() =>
                    patch({
                      bindings: Object.fromEntries(
                        Object.entries(node.bindings).filter(
                          (_, i) => i !== index,
                        ),
                      ),
                    })
                  }
                >
                  Remove binding {index + 1}
                </AppButton>
              </div>
            ))}
            <AppButton
              disabled={Object.keys(node.bindings).length >= 30}
              onClick={() =>
                patch({
                  bindings: {
                    ...node.bindings,
                    [node.capability === 'render' &&
                    !Object.hasOwn(node.bindings, 'plan')
                      ? 'plan'
                      : node.capability === 'ai' &&
                          !Object.hasOwn(node.bindings, 'context')
                        ? 'context'
                        : unusedId('field', Object.keys(node.bindings))]:
                      'input',
                  },
                })
              }
            >
              Add binding
            </AppButton>
          </section>
        )}
        {['context', 'ai', 'render', 'output'].includes(node.capability) && (
          <section>
            <h3>Output fields</h3>
            <p className="admin-muted">
              Named JSON fields. Context and Output need a matching binding for
              each field.
            </p>
            {node.outputs.map((name, index) => (
              <div key={index} className="admin-output-field">
                <FormField
                  label={`Output field ${index + 1}`}
                  value={name}
                  onChange={(e) =>
                    patch({
                      outputs: node.outputs.map((value, i) =>
                        i === index ? e.target.value : value,
                      ),
                    })
                  }
                />
                <AppButton
                  onClick={() =>
                    patch({
                      outputs: node.outputs.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove output {index + 1}
                </AppButton>
              </div>
            ))}
            <AppButton
              disabled={node.outputs.length >= 30}
              onClick={() =>
                patch({
                  outputs: [...node.outputs, unusedId('field', node.outputs)],
                })
              }
            >
              Add output field
            </AppButton>
          </section>
        )}
        {connections && (
          <section>
            <h3>Connections</h3>
            {connections}
          </section>
        )}
        <AppButton
          variant="danger"
          disabled={draft.nodes.length <= 1}
          onClick={onDelete}
        >
          Delete node
        </AppButton>
      </fieldset>
    </InspectorPanel>
  )
}
