import { describe, expect, test, vi } from 'vitest'
import { BrandRevisionConflictError, createBrandDesignSystemRepository } from './brandDesignSystemRepository.js'

const row = {
  id: 'brand-1', workspace_id: 'default', owner_id: 'designer-1', state: 'draft', revision: 2,
  active_version_id: null, draft: { name: 'Northstar' }, active_version: null,
  created_at: new Date('2026-09-07T09:00:00.000Z'), updated_at: new Date('2026-09-07T09:30:00.000Z'),
}

describe('brand design system repository', () => {
  test('maps database names and scopes reads to a workspace', async () => {
    const client = { query: vi.fn(async () => ({ rows: [row], rowCount: 1 })) }
    const repository = createBrandDesignSystemRepository(client)

    await expect(repository.get('brand-1', 'default')).resolves.toMatchObject({
      id: 'brand-1', workspaceId: 'default', ownerId: 'designer-1', activeVersionId: null, revision: 2,
    })
    expect(client.query).toHaveBeenCalledWith(expect.stringContaining('workspace_id = $2'), ['brand-1', 'default'])
  })

  test('scopes marketer reads through explicit brand membership', async () => {
    const client = { query: vi.fn(async () => ({ rows: [row], rowCount: 1 })) }
    const repository = createBrandDesignSystemRepository(client)
    await repository.getForMember('brand-1', 'marketer-1')
    expect(client.query.mock.calls[0][0]).toContain('brand_design_system_members')
    expect(client.query.mock.calls[0][1]).toEqual(['brand-1', 'marketer-1'])
  })

  test('replays the original publication version even after a newer version is active', async () => {
    const versionRow = { id: 'version-1', brand_id: 'brand-1', version_number: 1, snapshot: { name: 'Northstar' },
      published_by: 'designer-1', published_at: new Date(), schema_version: 1 }
    const client = { query: vi.fn(async () => ({ rows: [{ ...row, active_version_id: 'version-1', active_version: versionRow }], rowCount: 1 })) }
    const repository = createBrandDesignSystemRepository(client)
    await repository.findPublication('brand-1', 'publish-once')
    expect(client.query.mock.calls[0][0]).not.toContain('p.version_id = b.active_version_id')
  })

  test('uses optimistic revisions for draft writes', async () => {
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ revision: 3 }], rowCount: 1 }) }
    const repository = createBrandDesignSystemRepository(client)

    await expect(repository.patchDraft({ id: 'brand-1', workspaceId: 'default', expectedRevision: 2, draft: { name: 'Changed' } }))
      .rejects.toBeInstanceOf(BrandRevisionConflictError)
  })

  test('publishes an immutable snapshot and activates it using the locked row', async () => {
    const versionRow = {
      id: 'version-1', brand_id: 'brand-1', version_number: 1, snapshot: { name: 'Northstar' },
      published_by: 'designer-1', published_at: new Date('2026-09-07T10:00:00.000Z'), schema_version: 1,
    }
    const client = { query: vi.fn()
      .mockResolvedValueOnce({ rows: [versionRow], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...row, state: 'published', revision: 3, active_version_id: 'version-1', active_version: versionRow }], rowCount: 1 }) }
    const repository = createBrandDesignSystemRepository(client)

    const result = await repository.publish({ id: 'brand-1', workspaceId: 'default', versionId: 'version-1', versionNumber: 1,
      snapshot: { name: 'Northstar' }, publishedBy: 'designer-1', expectedRevision: 2 })

    expect(result.activeVersion).toMatchObject({ id: 'version-1', versionNumber: 1 })
    expect(client.query.mock.calls[0][0]).toContain('INSERT INTO brand_design_system_versions')
    expect(client.query.mock.calls[1][0]).toContain("state = 'published'")
  })
})
