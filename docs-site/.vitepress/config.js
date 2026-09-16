import { fileURLToPath } from 'node:url'
import { withMermaid } from 'vitepress-plugin-mermaid'
import taskLists from 'markdown-it-task-lists'

export default withMermaid({
  base: '/docs/',
  outDir: fileURLToPath(new URL('../../dist/docs/', import.meta.url)),
  title: 'Banner Studio Docs',
  description: 'Product behavior, architecture decisions and operations for Banner Studio',
  cleanUrls: true,
  appearance: false,
  markdown: {
    config: (md) => {
      md.use(taskLists, { enabled: true })
    },
  },
  themeConfig: {
    nav: [{ text: 'Product recipes', link: '/workflow' }, { text: 'Decisions & explorations', link: '/decisions/' }],
    search: { provider: 'local' },
    sidebar: [
      { text: 'Product', items: [{ text: 'Overview', link: '/' }, { text: 'Campaign modules', link: '/campaign-modules' }, { text: 'Technical architecture', link: '/architecture' }] },
      { text: 'Product recipes', items: [
        { text: 'All recipes', link: '/workflow' },
        { text: 'Banner creation', link: '/recipes/banner-creation' },
        { text: 'Campaign flow specification', link: '/recipes/campaign-flow' },
        { text: 'Slide deck creation', link: '/recipes/slide-deck-creation' },
        { text: 'Website creation', link: '/recipes/website-creation' },
        { text: 'Template creation', link: '/recipes/template-creation' },
        { text: 'Product logic designer', link: '/decisions/asset-workflows' },
      ] },
      { text: 'Decisions & explorations', items: [
        { text: 'Decision register', link: '/decisions/' },
        { text: 'Admin & data model', link: '/decisions/admin-data' },
        { text: 'Hosting options', link: '/decisions/hosting' },
        { text: 'Terraform & CLI setup', link: '/decisions/infrastructure' },
        { text: 'Delivery stages', link: '/decisions/delivery' },
        { text: 'Detailed backend proposal', link: '/decisions/backend-reference' },
        { text: 'Maintaining these docs', link: '/decisions/maintenance' },
      ] },
      { text: 'Earlier planning', collapsed: true, items: [{ text: 'Team process', link: '/team-process' }, { text: 'Original MVP roadmap', link: '/roadmap' }] },
    ],
    outline: { level: [2, 3] },
    socialLinks: [],
  },
  mermaid: { theme: 'base', themeVariables: { fontFamily: 'Inter, system-ui, sans-serif', primaryColor: '#eef1ff', primaryTextColor: '#1b2433', primaryBorderColor: '#3559d6', lineColor: '#8792a5', secondaryColor: '#fff7d8', tertiaryColor: '#f4faf7' } },
})
