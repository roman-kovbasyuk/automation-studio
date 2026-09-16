import { Surface } from 'brutalist-design-system'
import { useEffect, useRef, useState } from 'react'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { FormField } from '../../components/design-system/molecules/FormField.jsx'
import {
  DataTable,
  Drawer,
  SelectField,
  TextArea,
} from '../../components/design-system/organisms/OperationsLayout.jsx'
import {
  AdminLink,
  RequestState,
  useAdminResource,
  options,
  date,
} from './adminShared.jsx'
import { RecipeInspector } from './RecipeInspector.jsx'
import { RecipeCanvas } from './RecipeCanvas.jsx'
import {
  connectDraft,
  illustrativeFixture,
  makeNode,
  removeNodes,
} from './recipeGraph.js'
const noIssues = []
export function RecipeEditor({ client, id, ...props }) {
  const state = useAdminResource(async () => {
    const [recipe, capabilities] = await Promise.all([
      client.recipe(id),
      client.capabilities(),
    ])
    return { recipe, capabilities: capabilities.items }
  }, [client, id])
  if (!state.data)
    return (
      <section className="admin-page">
        <RequestState {...state} />
      </section>
    )
  return (
    <LoadedRecipeEditor
      client={client}
      initial={state.data.recipe}
      capabilities={state.data.capabilities}
      {...props}
    />
  )
}
function LoadedRecipeEditor({
  client,
  initial,
  capabilities,
  onNavigate,
  onDirtyChange,
  onBusyChange,
}) {
  const [panel, setPanel] = useState('')
  const [narrow, setNarrow] = useState(() => window.innerWidth < 900)
  useEffect(() => {
    const resize = () => setNarrow(window.innerWidth < 900)
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])
  const [saved, setSaved] = useState(initial),
    [draft, setDraft] = useState(initial.draft)
  const [selected, setSelected] = useState(''),
    [capability, setCapability] = useState('ai'),
    [target, setTarget] = useState(''),
    [branch, setBranch] = useState('true')
  const [busy, setBusy] = useState(''),
    [error, setError] = useState(null),
    [notice, setNotice] = useState('')
  const [validation, setValidation] = useState(null),
    [simulation, setSimulation] = useState(null),
    [reference, setReference] = useState(null)
  const [changeNote, setChangeNote] = useState(''),
    [fixtures, setFixtures] = useState(() => {
      const value = illustrativeFixture(initial.draft)
      return Object.fromEntries(
        Object.entries(value).map(([key, value]) => [
          key,
          JSON.stringify(value, null, 2),
        ]),
      )
    })
  const commandRef = useRef(false),
    publicationRef = useRef(null),
    selectorRef = useRef(null)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.draft)
  const node = draft.nodes.find((node) => node.id === selected)
  const valid =
    !dirty && validation?.valid && validation.revision === saved.draftRevision
  useEffect(() => {
    onDirtyChange?.(dirty)
  }, [dirty, onDirtyChange])
  useEffect(
    () => () => {
      onDirtyChange?.(false)
      onBusyChange?.(false)
    },
    [onDirtyChange, onBusyChange],
  )
  function edit(next) {
    if (commandRef.current) return
    setDraft(next)
    setValidation(null)
    setSimulation(null)
    setNotice('')
    onDirtyChange?.(JSON.stringify(next) !== JSON.stringify(saved.draft))
    if (!next.nodes.some((node) => node.id === selected)) setSelected('')
  }
  async function command(label, action) {
    if (commandRef.current) return
    commandRef.current = true
    setBusy(label)
    onBusyChange?.(true)
    setError(null)
    setNotice('')
    try {
      await action()
    } catch (error) {
      setError(error)
    } finally {
      commandRef.current = false
      setBusy('')
      onBusyChange?.(false)
    }
  }
  function save() {
    const snapshot = structuredClone(draft),
      revision = saved.draftRevision
    return command('Saving', async () => {
      const result = await client.save(saved.id, revision, snapshot)
      setSaved(result)
      setDraft(result.draft)
      setValidation(null)
      setSimulation(null)
      onDirtyChange?.(false)
      setNotice('Draft saved.')
    })
  }
  function reload() {
    if (
      dirty &&
      !window.confirm(
        'Discard your unsaved changes and reload the saved recipe?',
      )
    )
      return
    command('Reloading', async () => {
      const result = await client.recipe(saved.id)
      setSaved(result)
      setDraft(result.draft)
      setSelected('')
      setValidation(null)
      setSimulation(null)
      setReference(null)
      onDirtyChange?.(false)
      setNotice('Reloaded saved recipe.')
    })
  }
  function publish() {
    const signature = JSON.stringify([saved.draftRevision, changeNote.trim()])
    if (publicationRef.current?.signature !== signature)
      publicationRef.current = {
        signature,
        idempotencyKey: crypto.randomUUID(),
      }
    const body = {
      expectedRevision: saved.draftRevision,
      changeNote: changeNote.trim(),
      idempotencyKey: publicationRef.current.idempotencyKey,
    }
    command('Publishing', async () => {
      const result = await client.publish(saved.id, body)
      setSaved((current) => ({
        ...current,
        versions: result.versions,
        activeVersionId: result.activeVersionId,
      }))
      publicationRef.current = null
      setNotice('Version published. Activate it explicitly when ready.')
      setChangeNote('')
    })
  }
  const issues = Array.isArray(error?.details)
    ? error.details
    : validation?.issues || noIssues
  const closeInspector = () => {
    setSelected('')
    selectorRef.current?.focus()
  }
  const feedback = (
    <>
      {notice && <p role="status">{notice}</p>}
      {error && (
        <div role="alert">
          <strong>
            {error.status === 409 ? 'Save / revision conflict. ' : ''}
            {error.message}
          </strong>
          <p>
            Your local draft is retained. Retry the action or reload the saved
            recipe.
          </p>
        </div>
      )}
      {(validation || issues.length > 0) && (
        <div className="admin-validation" role="status">
          <strong>
            {validation?.valid && issues.length === 0
              ? 'Draft is valid.'
              : 'Validation needs attention.'}
          </strong>
          {issues.length > 0 && (
            <ul>
              {issues.map((issue, index) => (
                <li key={index}>
                  {issue.nodeId || issue.edgeId ? (
                    <AppButton
                      variant="quiet"
                      onClick={() => {
                        const id =
                          issue.nodeId ||
                          draft.edges.find((edge) => edge.id === issue.edgeId)
                            ?.source
                        setPanel('')
                        setSelected(id || '')
                      }}
                    >
                      {issue.message}
                    </AppButton>
                  ) : (
                    issue.message
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  )
  const connections = node ? (
    <div className="admin-connect">
      <SelectField
        label="Connect to"
        value={target}
        options={[
          { value: '', label: 'Choose destination' },
          ...draft.nodes
            .filter((item) => item.id !== selected)
            .map((item) => ({ value: item.id, label: item.label })),
        ]}
        onChange={(e) => setTarget(e.target.value)}
      />
      {node.capability === 'condition' && (
        <SelectField
          label="Branch"
          value={branch}
          options={[
            { value: 'true', label: 'True' },
            { value: 'false', label: 'False' },
          ]}
          onChange={(e) => setBranch(e.target.value)}
        />
      )}
      <AppButton
        disabled={
          !target ||
          !draft.nodes.some((item) => item.id === target) ||
          Boolean(busy) ||
          draft.edges.length >= 200
        }
        onClick={() =>
          edit(
            connectDraft(draft, {
              source: selected,
              target,
              branch: branch === 'true',
            }),
          )
        }
      >
        Connect nodes
      </AppButton>
      <div className="admin-connections">
        {draft.edges
          .filter(
            (edge) => edge.source === selected || edge.target === selected,
          )
          .map((edge) => (
            <AppButton
              key={edge.id}
              size="compact"
              disabled={Boolean(busy)}
              onClick={() =>
                edit({
                  ...draft,
                  edges: draft.edges.filter((item) => item.id !== edge.id),
                })
              }
            >
              Remove connection {edge.source} → {edge.target}
              {typeof edge.branch === 'boolean'
                ? ` · ${edge.branch ? 'True' : 'False'}`
                : ''}
            </AppButton>
          ))}
      </div>
    </div>
  ) : null
  const inspector = node ? (
    <RecipeInspector
      connections={connections}
      node={node}
      draft={draft}
      onChange={(updated, extra) =>
        edit({
          ...draft,
          ...extra,
          nodes: draft.nodes.map((item) =>
            item.id === selected ? updated : item,
          ),
        })
      }
      onDelete={() => edit(removeNodes(draft, [selected]))}
      onClose={closeInspector}
      busy={Boolean(busy)}
    />
  ) : null
  const simulationPanel = (
    <section aria-labelledby="admin-simulation-title">
      <h2 id="admin-simulation-title">Fixture simulation</h2>
      <p>
        Editable illustrative inputs. AI and render outputs are supplied
        fixtures; no provider or renderer runs.
      </p>
      <div className="admin-fixtures">
        {[
          ['input', 'Fixture input'],
          ['answers', 'Fixture answers'],
          ['outputs', 'Simulated AI / render outputs'],
        ].map(([key, label]) => (
          <TextArea
            key={key}
            label={label}
            rows={7}
            value={fixtures[key]}
            disabled={Boolean(busy)}
            onChange={(e) =>
              setFixtures((current) => ({
                ...current,
                [key]: e.target.value,
              }))
            }
          />
        ))}
      </div>
      <div className="admin-editor-toolbar">
        <AppButton
          disabled={dirty || Boolean(busy)}
          onClick={() =>
            command('Simulating', async () => {
              let fixture
              try {
                fixture = Object.fromEntries(
                  Object.entries(fixtures).map(([key, value]) => [
                    key,
                    JSON.parse(value),
                  ]),
                )
              } catch {
                throw new Error(
                  'Fixture input, answers and outputs must each contain valid JSON.',
                )
              }
              setSimulation(
                await client.simulate(
                  saved.id,
                  saved.draftRevision,
                  saved.draftHash,
                  fixture,
                ),
              )
            })
          }
        >
          Simulate
        </AppButton>
        <AppButton
          disabled={Boolean(busy)}
          onClick={() => {
            const value = illustrativeFixture(draft)
            setFixtures(
              Object.fromEntries(
                Object.entries(value).map(([key, value]) => [
                  key,
                  JSON.stringify(value, null, 2),
                ]),
              ),
            )
          }}
        >
          Use illustrative fixtures
        </AppButton>
        {dirty && (
          <span>
            Save the draft before validation, simulation or publication.
          </span>
        )}
      </div>
      {simulation && (
        <div className="admin-simulation-result">
          <h3>Simulation trace</h3>
          <p className="admin-hash">Saved hash: {simulation.draftHash}</p>
          <ol>
            {simulation.trace.map((step, index) => (
              <li key={index}>
                <strong>
                  {draft.nodes.find((node) => node.id === step.nodeId)?.label ||
                    step.nodeId}
                </strong>{' '}
                · {step.status.replaceAll('_', ' ')} · simulated
                {typeof step.decision === 'boolean'
                  ? ` · ${step.decision ? 'True' : 'False'} branch`
                  : ''}
                {Object.hasOwn(step, 'output') && (
                  <details>
                    <summary>Fixture output</summary>
                    <pre>{JSON.stringify(step.output, null, 2)}</pre>
                  </details>
                )}
              </li>
            ))}
          </ol>
          {simulation.pendingQuestions.length > 0 && (
            <>
              <h3>Pending questions</h3>
              <ul>
                {simulation.pendingQuestions.map((question) => (
                  <li key={question.id}>
                    {question.label} · {question.type}
                    {question.required ? ' · required' : ''}
                  </li>
                ))}
              </ul>
            </>
          )}
          {Object.hasOwn(simulation, 'output') && (
            <>
              <h3>Simulated result</h3>
              <pre>{JSON.stringify(simulation.output, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </section>
  )
  const historyPanel = (
    <section aria-labelledby="admin-publication-title">
      <h2 id="admin-publication-title">Publication and history</h2>
      <p>
        Publishing creates an immutable version. Activate a version separately
        for future use; activation preserves your current draft.
      </p>
      <FormField
        label="Change note"
        maxLength={2000}
        value={changeNote}
        disabled={Boolean(busy)}
        onChange={(e) => setChangeNote(e.target.value)}
      />
      <AppButton
        disabled={!valid || !changeNote.trim() || Boolean(busy)}
        onClick={publish}
      >
        Publish version
      </AppButton>
      {!valid && (
        <p className="admin-muted">
          Save and validate the current draft to enable publishing.
        </p>
      )}
      <DataTable
        label="Immutable recipe versions"
        rows={saved.versions}
        getRowId={(version) => version.id}
        emptyMessage="No published versions yet."
        columns={[
          {
            id: 'version',
            header: 'Version',
            cell: (version) =>
              `Version ${version.version}${saved.activeVersionId === version.id ? ' · Active' : ''}`,
          },
          {
            id: 'note',
            header: 'Change note',
            cell: (version) => version.changeNote,
          },
          {
            id: 'createdAt',
            header: 'Published',
            cell: (version) => date(version.createdAt),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (version) => (
              <div className="admin-version-actions">
                <AppButton
                  size="compact"
                  disabled={Boolean(busy)}
                  onClick={() =>
                    command('Loading reference', async () =>
                      setReference(
                        await client.reference(saved.id, version.id),
                      ),
                    )
                  }
                >
                  View reference {version.version}
                </AppButton>
                <AppButton
                  size="compact"
                  disabled={
                    Boolean(busy) || saved.activeVersionId === version.id
                  }
                  onClick={() =>
                    command('Activating', async () => {
                      const result = await client.activate(saved.id, version.id)
                      setSaved((current) => ({
                        ...current,
                        versions: result.versions,
                        activeVersionId: result.activeVersionId,
                      }))
                      setNotice(
                        `Version ${version.version} activated. Current draft preserved.`,
                      )
                    })
                  }
                >
                  Activate version {version.version}
                </AppButton>
              </div>
            ),
          },
        ]}
      />
      {reference && (
        <section className="admin-reference">
          <h3>Immutable reference · version {reference.version}</h3>
          <p className="admin-hash">{reference.hash}</p>
          <AppButton
            disabled={Boolean(busy)}
            onClick={() => {
              if (
                dirty &&
                !window.confirm(
                  'Discard your unsaved changes and restore this version as a draft?',
                )
              )
                return
              edit(structuredClone(reference.definition))
              setNotice(
                `Version ${reference.version} restored locally. Save draft to persist it.`,
              )
            }}
          >
            Restore as draft
          </AppButton>
          <details>
            <summary>View published definition</summary>
            <pre>{JSON.stringify(reference.definition, null, 2)}</pre>
          </details>
        </section>
      )}
    </section>
  )
  return (
    <section id="admin-workflow-canvas" className="admin-recipe-editor">
      <header className="admin-editor-header">
        <AdminLink to="/mvp/admin/recipes" onNavigate={onNavigate}>
          Product recipes
        </AdminLink>
        <div className="admin-page-title">
          <h1>{saved.title}</h1>
          <span>{saved.assetType}</span>
        </div>
        <div className="admin-editor-toolbar">
          <AppButton
            size="compact"
            variant="primary"
            disabled={!dirty || Boolean(busy)}
            busy={busy === 'Saving'}
            onClick={save}
          >
            Save draft
          </AppButton>
          <AppButton
            size="compact"
            disabled={dirty || Boolean(busy)}
            onClick={() =>
              command('Validating', async () => {
                const result = await client.validate(
                  saved.id,
                  saved.draftRevision,
                )
                setValidation({ ...result, revision: saved.draftRevision })
              })
            }
          >
            Validate
          </AppButton>
          <AppButton disabled={Boolean(busy)} onClick={reload}>
            Reload saved
          </AppButton>
          <Drawer
            open={panel === 'simulation'}
            onOpenChange={(open) => setPanel(open ? 'simulation' : '')}
            title="Fixture simulation"
            closeLabel="Close simulation"
            trigger={<AppButton size="compact">Simulation</AppButton>}
          >
            <div className="admin-root admin-panel-content">
              {feedback}
              {simulationPanel}
            </div>
          </Drawer>
          <Drawer
            open={panel === 'history'}
            onOpenChange={(open) => setPanel(open ? 'history' : '')}
            title="Publication and history"
            closeLabel="Close history"
            trigger={<AppButton size="compact">History</AppButton>}
          >
            <div className="admin-root admin-panel-content">
              {feedback}
              {historyPanel}
            </div>
          </Drawer>
          <span role="status">
            {busy
              ? `${busy}…`
              : dirty
                ? 'Unsaved changes'
                : `Saved · revision ${saved.draftRevision}`}
          </span>
        </div>
        <span className="admin-recipe-status">
          Simulation only · Active version:{' '}
          {saved.versions.find(
            (version) => version.id === saved.activeVersionId,
          )?.version ?? 'none'}
        </span>
        {!panel && feedback}
      </header>
      <div className="admin-editor-body">
        <div className="admin-graph-workspace">
          <div className="admin-graph-toolbar"><Surface><div className="admin-toolbar-content">
            <SelectField
              label="Selected node"
              ref={selectorRef}
              value={selected}
              options={[
                { value: '', label: 'Select a node' },
                ...draft.nodes.map((node) => ({
                  value: node.id,
                  label: node.label,
                })),
              ]}
              onChange={(e) => setSelected(e.target.value)}
            />
            <details className="admin-node-tools">
              <summary>Add a node</summary><div className="admin-add-node">
              <SelectField
                label="Node capability"
                value={capability}
                options={capabilities.map((item) => ({
                  value: item.key,
                  label: item.title,
                }))}
                onChange={(e) => setCapability(e.target.value)}
              />
              <AppButton
                disabled={Boolean(busy) || draft.nodes.length >= 100}
                onClick={() => {
                  const next = makeNode(capability, draft.nodes)
                  edit({ ...draft, nodes: [...draft.nodes, next] })
                  setSelected(next.id)
                }}
              >
                Add node
              </AppButton></div>
            </details>
          </div></Surface></div>
          <RecipeCanvas
            draft={draft}
            selected={selected}
            onSelect={setSelected}
            onChange={edit}
            busy={Boolean(busy)}
            issues={issues}
          />
          <p className="admin-canvas-hint">
            Drag to arrange · Connect handles · Select to edit · Delete to
            remove
          </p>
        </div>
        {node && !narrow && inspector}
        <Drawer
          open={Boolean(node) && narrow}
          onOpenChange={(open) => {
            if (!open) closeInspector()
          }}
          title="Node settings"
          returnFocusRef={selectorRef}
          closeLabel="Close node settings"
        >
          <div className="admin-root admin-panel-content">{inspector}</div>
        </Drawer>
      </div>
    </section>
  )
}
