import { screen, userEvent, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import IndexRoute from '../app/index';

describe('foundation navigation', () => {
  test('renders the index route and changes theme and language', async () => {
    const user = userEvent.setup();

    await renderRouter({
      _layout: RootLayout,
      index: IndexRoute,
    });

    expect(await screen.findByText('luckgage v2')).toBeTruthy();
    expect(screen.getByText('Tùy chỉnh nền tảng')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Tối' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tối', selected: true })).toBeTruthy();
    });

    await user.press(screen.getByRole('button', { name: 'English' }));

    await waitFor(() => {
      expect(screen.getByText('Foundation preferences')).toBeTruthy();
    });
  });
});
