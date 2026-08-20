import { test, expect, type Locator, type Page } from '@playwright/test';
import { gotoPage } from './utils';

const SECTION_TITLES = [
  'Default Format & Time zone',
  'Format by Column Name & Type',
  'Theme',
  'Editor',
  'Keyboard Shortcuts',
  'Advanced',
];

function settingsMenu(page: Page): Locator {
  return page.locator('.app-settings-menu');
}

function sectionTrigger(page: Page, title: string): Locator {
  return settingsMenu(page).getByRole('button', { name: title, exact: true });
}

function themePicker(page: Page): Locator {
  return settingsMenu(page).getByRole('button', {
    name: /Pick a color scheme/,
  });
}

/** The time zone select is unique to the default formatting section */
function formattingSection(page: Page): Locator {
  return settingsMenu(page).locator('#select-reset-timezone');
}

async function openSettingsMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'User Settings' }).click();
  await expect(settingsMenu(page)).toBeVisible();
}

async function closeSettingsMenu(page: Page): Promise<void> {
  await settingsMenu(page)
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(settingsMenu(page)).toHaveCount(0);
}

async function selectTheme(page: Page, themeName: string): Promise<void> {
  await themePicker(page).click();
  await page.getByRole('option', { name: themeName, exact: true }).click();
}

test.describe('settings menu', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPage(page, '');
  });

  test('opens from the app toolbar and closes', async ({ page }) => {
    await expect(settingsMenu(page)).toHaveCount(0);

    await openSettingsMenu(page);
    await expect(
      settingsMenu(page).getByRole('heading', { name: 'Settings' })
    ).toBeVisible();

    await closeSettingsMenu(page);
  });

  test('shows every section with formatting expanded by default', async ({
    page,
  }) => {
    await openSettingsMenu(page);

    await expect(
      settingsMenu(page).locator('.btn-collapse-trigger')
    ).toHaveText(SECTION_TITLES);

    await expect(formattingSection(page)).toBeVisible();
    await expect(themePicker(page)).toBeHidden();
  });

  test('expands only one section at a time', async ({ page }) => {
    await openSettingsMenu(page);

    await sectionTrigger(page, 'Theme').click();
    await expect(themePicker(page)).toBeVisible();
    await expect(formattingSection(page)).toBeHidden();

    await sectionTrigger(page, 'Theme').click();
    await expect(themePicker(page)).toBeHidden();
  });

  test('switches the color theme', async ({ page }) => {
    await openSettingsMenu(page);
    await sectionTrigger(page, 'Theme').click();

    const lightThemeStyle = page.locator(
      'style[data-theme-key="default-light"]'
    );
    await expect(lightThemeStyle).toHaveCount(0);

    await selectTheme(page, 'Default Light');
    await expect(lightThemeStyle).toHaveCount(1);
    await expect(themePicker(page)).toContainText('Default Light');

    await selectTheme(page, 'Default Dark');
    await expect(lightThemeStyle).toHaveCount(0);
    await expect(themePicker(page)).toContainText('Default Dark');
  });

  test('resets a modified decimal format to the default', async ({ page }) => {
    await openSettingsMenu(page);

    const decimalInput = settingsMenu(page).locator(
      '#default-decimal-format-input'
    );
    const resetButton = settingsMenu(page).getByTestId('btn-reset-decimal');

    const defaultFormat = await decimalInput.inputValue();
    await expect(resetButton).toHaveClass(/hidden/);

    await decimalInput.fill('0.00%');
    await expect(resetButton).not.toHaveClass(/hidden/);

    await resetButton.click();
    await expect(decimalInput).toHaveValue(defaultFormat);
    await expect(resetButton).toHaveClass(/hidden/);
  });

  test('persists a formatting change while the menu is reopened', async ({
    page,
  }) => {
    await openSettingsMenu(page);

    const showTimeZoneLabel = settingsMenu(page).getByText(
      'Show time zone in dates'
    );
    const showTimeZone = settingsMenu(page).getByRole('checkbox', {
      name: 'Show time zone in dates',
    });

    const wasChecked = await showTimeZone.isChecked();

    await showTimeZoneLabel.click();
    await expect(showTimeZone).toBeChecked({ checked: !wasChecked });

    await closeSettingsMenu(page);
    await openSettingsMenu(page);
    await expect(showTimeZone).toBeChecked({ checked: !wasChecked });

    // Restore the original value so the shared workspace isn't left modified
    await showTimeZoneLabel.click();
    await expect(showTimeZone).toBeChecked({ checked: wasChecked });
  });
});
