import { fileURLToPath } from 'node:url'
import { withMermaid } from 'vitepress-plugin-mermaid'
import taskLists from 'markdown-it-task-lists'

// docs/ is the single documentation source (decision D11). This folder only renders it.
export default withMermaid({
  base: '/docs/',
  srcDir: '../docs',
  // The archive is browsed in the repository, not published on the site.
  srcExclude: ['archive/**'],
  outDir: fileURLToPath(new URL('../../dist/docs/', import.meta.url)),
  title: 'Automation Studio Docs',
  description: 'Product concept, decisions, recipes and engineering reference for Automation Studio',
  cleanUrls: true,
  appearance: false,
  // Links to repository files outside docs/ (root contracts, vendor notes, source READMEs)
  // and to the unpublished archive resolve in the repository but not on the site.
  ignoreDeadLinks: [
    /(^|\/)(FRONTEND|DESIGN|PRODUCT|AGENTS|CLAUDE|README)(\.md)?$/,
    /(^|\/)vendor\//,
    /(^|\/)archive\//,
    /^https?:\/\/(localhost|127\.0\.0\.1)/,
  ],
  markdown: {
    config: (md) => {
      md.use(taskLists, { enabled: true })
    },
  },
  themeConfig: {
    nav: [
      { text: 'Product', link: '/product/concept' },
      { text: 'Engineering', link: '/engineering/architecture' },
      { text: 'Decisions', link: '/product/decisions' },
    ],
    search: { provider: 'local' },
    sidebar: [
      { text: 'Start', items: [{ text: 'Overview', link: '/' }] },
      { text: 'Product', items: [
        { text: 'Concept', link: '/product/concept' },
        { text: 'Glossary', link: '/product/glossary' },
        { text: 'Decisions', link: '/product/decisions' },
        { text: 'Recipes', link: '/product/recipes' },
        { text: 'Roadmap', link: '/product/roadmap' },
      ] },
      { text: 'Specifications', items: [
        { text: 'Design system integration', link: '/specs/design-system-integration' },
      ] },
      { text: 'Engineering', items: [
        { text: 'Architecture', link: '/engineering/architecture' },
        { text: 'Local development', link: '/engineering/local-development' },
        { text: 'AI generation', link: '/engineering/ai-generation' },
        { text: 'Known issues', link: '/engineering/known-issues' },
        { text: 'Campaign modules (current)', link: '/engineering/campaign-modules' },
        { text: 'Briefing (current)', link: '/engineering/briefing' },
        { text: 'Banner templates and brands', link: '/engineering/templates/banner-template-editor' },
        { text: 'MSD slide templates', link: '/engineering/templates/msd-presentation-templates' },
        { text: 'Admin area', link: '/engineering/admin' },
        { text: 'Proposal: admin and data model', link: '/engineering/proposals/admin-and-data-model' },
      ] },
      { text: 'Application design system', collapsed: true, items: [
        { text: 'Overview', link: '/design-system/' },
        { text: 'Consumer boundary', link: '/design-system/migration' },
        { text: 'Gap list', link: '/design-system/missing-components' },
        { text: 'Adoption audit', link: '/design-system/adoption-audit' },
        { text: 'Design brief template', link: '/design-system/page-brief-template' },
        { text: 'Brief: banner creation rebuild', link: '/design-system/pages/banner-creation-rebuild' },
        { text: 'Brief: templates catalog', link: '/design-system/pages/templates' },
        { text: 'Brief: offline prototype', link: '/design-system/pages/prototype-creation' },
      ] },
      { text: 'Operations', collapsed: true, items: [
        { text: 'Hosting options', link: '/operations/hosting' },
        { text: 'Infrastructure', link: '/operations/infrastructure' },
      ] },
      { text: 'About', items: [{ text: 'Maintaining these docs', link: '/documentation' }] },
    ],
    outline: { level: [2, 3] },
    socialLinks: [],
  },
  mermaid: { theme: 'base', themeVariables: { fontFamily: 'Inter, system-ui, sans-serif', primaryColor: '#eef1ff', primaryTextColor: '#1b2433', primaryBorderColor: '#3559d6', lineColor: '#8792a5', secondaryColor: '#fff7d8', tertiaryColor: '#f4faf7' } },
})
