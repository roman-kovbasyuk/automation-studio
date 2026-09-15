/** Only current library exports; these links remain catalog destinations until phase two. */
export const componentGroups = [
  { title:'Actions', items:[['Button','button'],['Text action','text-action'],['Form actions','form-actions'],['Inline confirmation','inline-confirmation']] },
  { title:'Displaying Data', items:[['Table','table'],['Tag / Status badge','tag'],['Progress bar','progress-bar'],['Progress ring','progress-ring'],['Rating','rating']] },
  { title:'Feedback', items:[['Alert','alert'],['Toast','toast'],['Tooltip','tooltip'],['Spinner','spinner'],['Skeleton','skeleton'],['Empty state','empty-state']] },
  { title:'Form', items:[['Form','form'],['Text field','text-field'],['Search field','search-field'],['Password field','password-field'],['Text area','textarea'],['Checkbox','checkbox'],['Radio group','radio-group'],['Toggle','toggle'],['Select / Combobox / MultiSelect','dropdowns'],['Date picker','date-picker'],['Number stepper','number-stepper'],['Slider','slider'],['Range slider','range-slider'],['File dropzone','file-dropzone'],['File list','file-list'],['Attachment area','attachment-area'],['Inline text','inline-text']] },
  { title:'Layout', items:[['Panel','panel'],['Tabs / Segmented control','tabs']] },
  { title:'Navigation', items:[['Breadcrumbs','breadcrumbs'],['Pagination','pagination'],['Navigation list','navigation-list'],['Workflow steps','workflow-steps']] },
  { title:'Overlays', items:[['Menu','menu'],['Dialog','dialog'],['Drawer','drawer'],['Popover','popover']] },
] as const
