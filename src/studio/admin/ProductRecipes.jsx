import { Surface } from 'brutalist-design-system'
import { useState } from 'react'
import {
  DataTable,
  SelectField,
} from '../../components/design-system/organisms/OperationsLayout.jsx'
import { FormField } from '../../components/design-system/molecules/FormField.jsx'
import { AppButton } from '../../components/design-system/atoms/AppButton.jsx'
import { assetTypes } from '../../../shared/assetWorkflowContracts.js'
import {
  AdminLink,
  RequestState,
  useAdminResource,
  options,
  date,
  human,
} from './adminShared.jsx'
import { minimalDraft } from './recipeGraph.js'
export function ProductRecipes({ client, onNavigate, compatibility }) {
  const state = useAdminResource(() => client.recipes(), [client])
  const [creating, setCreating] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null)
  const [title, setTitle] = useState(''),
    [key, setKey] = useState(''),
    [assetType, setAssetType] = useState('banners')
  async function create(event) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const recipe = await client.create({
        key,
        title,
        assetType,
        draft: minimalDraft(),
      })
      onNavigate(`/mvp/admin/recipes/${encodeURIComponent(recipe.id)}`)
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section id="admin-product-recipes" className="admin-page">
      <div className="admin-page-title">
        <h1>Product recipes</h1>
        <AppButton
          variant="primary"
          onClick={() => setCreating((value) => !value)}
        >
          {creating ? 'Close create form' : 'Create recipe'}
        </AppButton>
      </div>
      <p>
        Configure the path from product input to output. Drafts, validation and
        fixture simulation are available; live execution is not connected.
      </p>
      {compatibility && (
        <p className="admin-muted">
          Asset workflows are now Product recipes. Open a saved recipe below to
          edit its workflow.
        </p>
      )}
      {creating && (
        <Surface><form className="admin-create" onSubmit={create}>
          <h2>Create recipe</h2>
          <fieldset disabled={busy}>
            <FormField
              label="Recipe title"
              required
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <FormField
              label="Recipe key"
              required
              pattern="[a-zA-Z][a-zA-Z0-9_-]{0,63}"
              hint="A unique key, beginning with a letter. Use letters, numbers, hyphens or underscores."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <SelectField
              label="Product family"
              value={assetType}
              options={options(assetTypes)}
              onChange={(e) => setAssetType(e.target.value)}
            />
            <AppButton type="submit" variant="primary" busy={busy}>
              Create and open
            </AppButton>
          </fieldset>
          {error && <p role="alert">{error.message}</p>}
        </form></Surface>
      )}
      <RequestState {...state} />
      {state.data && (
        <DataTable
          label="Persisted product recipes"
          rows={state.data.items}
          getRowId={(row) => row.id}
          emptyMessage="No recipes have been created. Create a recipe to start configuring a product family."
          columns={[
            {
              id: 'title',
              header: 'Recipe',
              cell: (row) => (
                <AdminLink
                  to={`/mvp/admin/recipes/${encodeURIComponent(row.id)}`}
                  onNavigate={onNavigate}
                >
                  {row.title}
                </AdminLink>
              ),
            },
            {
              id: 'family',
              header: 'Product family',
              cell: (row) => human(row.assetType),
            },
            {
              id: 'state',
              header: 'Publication',
              cell: (row) =>
                row.versions.length
                  ? `${row.versions.length} published · ${row.activeVersionId ? 'active version ' + row.versions.find((v) => v.id === row.activeVersionId)?.version : 'not active'}`
                  : 'Draft only',
            },
            {
              id: 'revision',
              header: 'Draft revision',
              cell: (row) => row.draftRevision,
            },
            {
              id: 'updated',
              header: 'Updated',
              cell: (row) => date(row.updatedAt),
            },
          ]}
        />
      )}
    </section>
  )
}
