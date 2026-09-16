// Canonical creation/template catalog. Sidebar labels and API types share these IDs.
export const projectTypeSections = [
  {
    label: 'Ads',
    slug: 'ads',
    accent: 'var(--v2-accent)',
    items: [
      {
        id: 'banners',
        label: 'Campaign banners',
        description: 'Build campaign-ready static or animated banner variations.',
        formats: ['Static banners', 'Animated banners'],
        icon: 'LayoutTemplate',
        illustration: '/assets/asset-illustrations/banner.svg',
        available: true
      },
      {
        id: 'reels',
        label: 'Reels',
        description: 'Create short-form social vertical campaigns.',
        formats: ['Vertical Reels', 'Square videos'],
        icon: 'Video',
        illustration: '/assets/asset-illustrations/reels.svg'
      }
    ]
  },
  {
    label: 'Web',
    slug: 'web',
    accent: 'var(--v2-success)',
    items: [
      {
        id: 'landing-page',
        label: 'Landing page',
        description: 'Create a connected campaign destination for acquisition.',
        formats: ['Landing page templates'],
        icon: 'Globe2',
        illustration: '/assets/asset-illustrations/web-teal.svg'
      },
      {
        id: 'website-page',
        label: 'Website page',
        description: 'Build a focused webpage for a specific content section.',
        formats: ['Web page layouts'],
        icon: 'Globe2',
        illustration: '/assets/asset-illustrations/web-teal.svg'
      }
    ]
  },
  {
    label: 'Presentations',
    slug: 'presentations',
    accent: 'var(--v2-danger)',
    items: [
      {
        id: 'presentations',
        label: 'Slidedeck',
        description: 'Shape a presentation with layouts designed for the story you need to tell.',
        formats: ['Presentations'],
        icon: 'Presentation',
        illustration: '/assets/asset-illustrations/deck-red.svg',
        available: true
      }
    ]
  },
  {
    label: 'Other',
    slug: 'other',
    accent: 'var(--marker-yellow, #ffe27a)',
    items: [
      {
        id: 'business-cards',
        label: 'Business cards',
        description: 'Create a consistent card design with a dedicated template group.',
        formats: ['Documents'],
        icon: 'Mail',
        illustration: '/assets/asset-illustrations/business-card-yellow.svg',
        available: false
      },
      {
        id: 'email-signature',
        label: 'Email signature',
        description: 'Create a branded email signature matching your tone and style.',
        formats: ['Email signature blocks'],
        icon: 'AtSign',
        illustration: '/assets/asset-illustrations/email-signature-yellow.svg'
      },
      {
        id: 'icon-badge-set',
        label: 'Icon Badge set',
        description: 'Assemble a coordinated icon badge family for a campaign system.',
        formats: ['Icon badge sets'],
        icon: 'LayoutTemplate',
        illustration: '/assets/asset-illustrations/icon-badge-set.svg',
        available: false,
        uiOnly: true
      }
    ]
  }
]

export const projectTypes = projectTypeSections.flatMap(section => section.items.filter(item => !item.uiOnly).map(item => item.id))
