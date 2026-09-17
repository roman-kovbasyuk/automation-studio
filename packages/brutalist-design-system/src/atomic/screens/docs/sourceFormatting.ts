/** Keep source bodies verbatim; only adapt internal imports for package consumers. */
export function toPublicSource(source: string): string {
  return "import 'brutalist-design-system/styles.css'\n" + source.replace(/from '\.\.\/\.\.\/\.\.\/(?:atoms|components)'/g, "from 'brutalist-design-system'")
}
