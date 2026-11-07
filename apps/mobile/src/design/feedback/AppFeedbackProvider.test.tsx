import { render, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppButton } from '@/design/components/AppButton';
import { AppText } from '@/design/components/AppText';
import { AppThemeProvider } from '@/design/theme/AppThemeProvider';
import { I18nProvider } from '@/i18n/I18nProvider';
import { PreferencesProvider } from '@/platform/preferences/PreferencesProvider';

import { AppFeedbackProvider, useAppFeedback } from './AppFeedbackProvider';

function FeedbackFixture() {
  const { choose, confirm, showToast } = useAppFeedback();
  const [result, setResult] = useState('idle');

  return (
    <>
      <AppText>{result}</AppText>
      <AppButton
        label="Open confirm"
        onPress={() => {
          void confirm({
            body: 'This cannot be undone.',
            confirmLabel: 'Delete now',
            title: 'Delete item?',
            tone: 'danger',
          }).then((approved) => setResult(approved ? 'confirmed' : 'cancelled'));
        }}
      />
      <AppButton
        label="Open actions"
        onPress={() => {
          void choose({
            actions: [{ id: 'edit', label: 'Edit item' }],
            title: 'Item actions',
          }).then((action) => setResult(action ?? 'dismissed'));
        }}
      />
      <AppButton
        label="Show toast"
        onPress={() => showToast({ message: 'Copied to clipboard', tone: 'success' })}
      />
    </>
  );
}

function renderFixture() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 844, width: 390, x: 0, y: 0 },
        insets: { bottom: 34, left: 0, right: 0, top: 47 },
      }}>
      <PreferencesProvider>
        <I18nProvider>
          <AppThemeProvider>
            <AppFeedbackProvider>
              <FeedbackFixture />
            </AppFeedbackProvider>
          </AppThemeProvider>
        </I18nProvider>
      </PreferencesProvider>
    </SafeAreaProvider>,
  );
}

describe('AppFeedbackProvider', () => {
  test('resolves branded confirmation and action-sheet choices', async () => {
    const user = userEvent.setup();
    const view = await renderFixture();

    await user.press(view.getByRole('button', { name: 'Open confirm' }));
    expect(await view.findByRole('header', { name: 'Delete item?' })).toBeTruthy();
    await user.press(view.getByRole('button', { name: 'Delete now' }));
    expect(await view.findByText('confirmed')).toBeTruthy();

    await user.press(view.getByRole('button', { name: 'Open actions' }));
    expect(await view.findByRole('header', { name: 'Item actions' })).toBeTruthy();
    await user.press(view.getByRole('button', { name: 'Edit item' }));
    expect(await view.findByText('edit')).toBeTruthy();
  });

  test('shows passive feedback as an accessible toast', async () => {
    const user = userEvent.setup();
    const view = await renderFixture();

    await user.press(view.getByRole('button', { name: 'Show toast' }));

    const message = await view.findByText('Copied to clipboard', { includeHiddenElements: true });
    expect(message.parent?.props.accessibilityRole).toBe('alert');
  });
});
