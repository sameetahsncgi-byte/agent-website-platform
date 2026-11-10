// Curated palettes; only the selected ID is stored in the database.
const palettes = [
  ['forest', 'Forest Green', '#166534', '#14532d', '#f0fdf4'],
  ['ocean', 'Ocean Blue', '#1d4ed8', '#172554', '#eff6ff'],
  ['violet', 'Royal Violet', '#7c3aed', '#3b0764', '#f5f3ff'],
  ['teal', 'Tropical Teal', '#0f766e', '#134e4a', '#f0fdfa'],
  ['rose', 'Vibrant Rose', '#be185d', '#500724', '#fff1f2'],
  ['sunset', 'Sunset Orange', '#c2410c', '#431407', '#fff7ed'],
  ['ruby', 'Ruby Red', '#b91c1c', '#450a0a', '#fef2f2'],
  ['indigo', 'Electric Indigo', '#4338ca', '#1e1b4b', '#eef2ff'],
  ['cyan', 'Coastal Cyan', '#0e7490', '#164e63', '#ecfeff'],
  ['amber', 'Golden Amber', '#a16207', '#422006', '#fffbeb'],
  ['magenta', 'Bold Magenta', '#a21caf', '#4a044e', '#fdf4ff'],
  ['lime', 'Fresh Lime', '#4d7c0f', '#1a2e05', '#f7fee7'],
];
export const THEMES = palettes.map(([id, name, primary, dark, surface]) => ({ id, name, primary, dark, surface }));
export function getTheme(id) {
  return THEMES.find(theme => theme.id === id) || THEMES[0];
}
export function themeVariables(id) {
  const theme = getTheme(id);
  return {
    '--green': theme.primary,
    '--dark-green': theme.dark,
    '--gold': theme.primary,
    '--paper': '#fffefa',
    '--muted': '#62665f',
    '--border': '#deded8',
    '--theme-surface': theme.surface,
    '--theme-hover': theme.dark,
    '--theme-shade': `${theme.dark}e6`,
    '--theme-fade': `${theme.dark}45`,
  };
}
