import { useTheme } from '@deephaven/components';

/**
 * Sidebar panel content exposing application settings. Currently provides a
 * theme selector to switch between the available (e.g. dark and light) themes.
 */
export function Settings(): JSX.Element {
  const { selectedThemeKey, setSelectedThemeKey, themes } = useTheme();

  return (
    <div className="settings-tools">
      <div className="settings-tools-header">Settings</div>
      <label className="settings-field" htmlFor="settings-theme-select">
        <span className="settings-field-label">Theme</span>
        <select
          id="settings-theme-select"
          className="settings-theme-select"
          value={selectedThemeKey}
          onChange={e => setSelectedThemeKey(e.target.value)}
        >
          {themes.map(theme => (
            <option key={theme.themeKey} value={theme.themeKey}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default Settings;
