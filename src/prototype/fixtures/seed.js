import { studioTemplates } from '../../../shared/studioTemplates.js'
import { createEmptyBrandDraft } from '../../../shared/brandDesignSystem.js'

const now = '2026-09-15T12:00:00.000Z'

function draftCampaign({ id, title, createdBy = 'prototype-marketer' }) {
  return {
    projectType: 'banners', id, title, status: 'draft', revision: 0,
    brief: { product: 'Headphones', audience: 'Commuters', objective: 'Shop the collection', offer: '20% off', locale: 'en', notes: 'Promote headphones for a quieter commute.' },
    selectedCopyId: null, selectedDirectionId: null, compositionId: null, currentVersionNumber: 0, openVersionId: null,
    createdBy, createdAt: now, updatedAt: now, archivedAt: null,
  }
}

export function createPrototypeSeed() {
  const templates = studioTemplates.map(manifest => ({ id: manifest.id, name: manifest.name, version: manifest.version, manifest }))
  const campaign = draftCampaign({ id: 'prototype-campaign-1', title: 'Quiet autumn launch' })
  const brandDraft = createEmptyBrandDraft('Folkeuniversitetet')
  return {
    schemaVersion: 1,
    epoch: 0,
    actor: { id: 'prototype-marketer', role: 'marketer', displayName: 'Prototype Marketer', email: 'prototype@example.test' },
    workspaces: {
      [campaign.id]: { campaign, copies: [], directions: [], composition: null, versions: [], jobs: [], delivery: null },
    },
    brands: [{ id: 'folkeuniversitetet', workspaceId: 'prototype', ownerId: 'prototype-designer', state: 'published', revision: 1,
      activeVersionId: 'folkeuniversitetet-v1', activeVersion: { id: 'folkeuniversitetet-v1', versionNumber: 1, snapshot: brandDraft },
      draft: { ...brandDraft, currentStep: 'publish' }, createdAt: now, updatedAt: now }],
    templates,
    reviewHistories: {}, figmaHandoffs: {}, jobs: {}, receipts: {}, decks: {}, drafts: {},
  }
}
