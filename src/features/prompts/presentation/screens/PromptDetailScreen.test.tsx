import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithTheme } from '../../../../test-utils/renderWithTheme';
import {
  authorId,
  categoryId,
  promptId as toPromptId,
} from '@core/types/branded';
import { type PromptDetail } from '@features/prompts/domain/entities/Prompt';

const mockGoBack = jest.fn();
const mockPush = jest.fn();
const mockNavigate = jest.fn();

// The hero deliberately runs under the status bar, so the screen reads insets
// directly rather than taking a pad from Screen. No provider here — fixed
// values keep the assertions about behaviour, not about device chrome.
jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
    SafeAreaView: actual.SafeAreaView,
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, push: mockPush, navigate: mockNavigate }),
  useRoute: () => ({ params: { promptId: 'p1' } }),
}));

const mockUsePromptById = jest.fn();
jest.mock('../hooks/usePrompts', () => ({
  usePromptById: () => mockUsePromptById(),
}));

/**
 * The DI container reaches Firestore, which Jest cannot transform. Mocking it
 * rather than the engagement hooks keeps the REAL ledger and the real hook
 * wiring under test — the assertions below are about a tap moving a number,
 * which is exactly the part worth proving.
 */
const mockIncrementStat = jest.fn().mockResolvedValue(undefined);
jest.mock('@app/di/container', () => ({
  container: () => ({ promptRepository: { incrementStat: mockIncrementStat } }),
}));

// The rails run their own queries and are not what these assertions are about.
jest.mock('../components/PromptRelatedRail', () => ({ PromptRelatedRail: () => null }));
jest.mock('../components/PromptSectionRail', () => ({ PromptSectionRail: () => null }));

import { PromptDetailScreen } from './PromptDetailScreen';
import { resetEngagementRateLimit, resetViewedThisSession } from '../hooks/useEngagement';
import { useEngagementStore } from '../stores/engagementStore';

const detail = (): PromptDetail => ({
  id: toPromptId('p1'),
  title: 'Golden hour portrait',
  thumbnailUrl: 'https://example.test/t.jpg',
  blurHash: null,
  aspectRatio: 0.8,
  categoryId: categoryId('cat_couple'),
  categoryName: 'Couple',
  author: { id: authorId('a1'), name: 'Ada Lovelace', avatarUrl: null },
  stats: { likesCount: 12, viewsCount: 340, copiesCount: 5, favoritesCount: 2, sharesCount: 1 },
  isFeatured: false,
  isTrending: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  prompt: 'a portrait at golden hour',
  imageUrl: 'https://example.test/i.jpg',
  images: [
    {
      url: 'https://example.test/i.jpg',
      thumbnailUrl: 'https://example.test/t.jpg',
      width: 800,
      height: 1000,
      aspectRatio: 0.8,
    },
  ],
  sourceUrl: null,
  tags: ['portrait'],
  metadata: {
    model: 'Midjourney',
    modelVersion: 'v6',
    negativePrompt: null,
    aspectRatio: '4:5',
    resolution: { width: 800, height: 1000 },
    style: null,
    generationParameters: {},
  },
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('PromptDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Both stores are module-level singletons; without a reset the counts from
    // one test would leak into the next one's expectations.
    resetViewedThisSession();
    // Without this the 2s cooldown carries between tests and the second one to
    // press Copy on 'p1' would silently record nothing.
    resetEngagementRateLimit();
    useEngagementStore.setState({ pending: {} });
    // clearAllMocks only wipes call history, so an implementation set inside
    // one test would leak into the next.
    mockIncrementStat.mockReset();
    mockIncrementStat.mockResolvedValue(undefined);
    mockUsePromptById.mockReturnValue({ data: detail(), isError: false, refetch: jest.fn() });
  });

  // The flusher is a module singleton holding a retry timer. Left running, it
  // keeps the Node event loop alive and Jest never exits.
  afterEach(() => {
    resetEngagementRateLimit();
  });

  describe('engagement', () => {
    it('shows views, copies and shares — and no longer shows likes', () => {
      const { getByTestId, queryByText } = renderWithTheme(<PromptDetailScreen />);

      expect(getByTestId('stat-copies')).toHaveTextContent('5 copies');
      expect(getByTestId('stat-shares')).toHaveTextContent('1 shares');
      expect(queryByText(/likes/)).toBeNull();
    });

    it('counts a view once per session, not once per mount', () => {
      const { unmount } = renderWithTheme(<PromptDetailScreen />);
      unmount();
      renderWithTheme(<PromptDetailScreen />);

      // Asserted on the ledger, not on a network call: writes are batched by
      // the flusher, so "how many times was the server told" is deliberately
      // not the same question as "how many views were counted".
      expect(useEngagementStore.getState().pending.p1?.viewsCount).toBe(1);
    });

    it('moves the copy count in the same frame as the tap', () => {
      const { getByTestId } = renderWithTheme(<PromptDetailScreen />);
      expect(getByTestId('stat-copies')).toHaveTextContent('5 copies');

      fireEvent.press(getByTestId('copy-prompt'));

      // 5 from the server + 1 counted locally. The number must move without
      // waiting for the write, which is now batched behind the flush window.
      expect(getByTestId('stat-copies')).toHaveTextContent('6 copies');
      expect(useEngagementStore.getState().pending.p1?.copiesCount).toBe(1);
    });

    /**
     * The abuse case: a held-down button. The count must stay believable and
     * the network must not see one request per press.
     */
    it('ignores repeat presses inside the cooldown', () => {
      const { getByTestId } = renderWithTheme(<PromptDetailScreen />);

      for (let i = 0; i < 25; i += 1) {
        fireEvent.press(getByTestId('copy-prompt'));
      }

      expect(useEngagementStore.getState().pending.p1?.copiesCount).toBe(1);
      expect(getByTestId('stat-copies')).toHaveTextContent('6 copies');
    });

    /**
     * The write is rejected today — the security rules require a signed-in user
     * and there is no auth yet. The count must still behave.
     */
    it('keeps the local count when the server write is refused', async () => {
      mockIncrementStat.mockRejectedValue(new Error('permission-denied'));
      const { getByTestId } = renderWithTheme(<PromptDetailScreen />);

      fireEvent.press(getByTestId('copy-prompt'));
      await act(async () => {
        await Promise.resolve();
      });

      // Unsettled, so it is still counted locally and stays queued for retry.
      expect(useEngagementStore.getState().pending.p1?.copiesCount).toBe(1);
      expect(getByTestId('stat-copies')).toHaveTextContent('6 copies');
    });
  });

  /**
   * The screen hides the navigator's header so the image can start at the top
   * edge, which makes this the ONLY way back on iOS — a missing or unwired
   * control would strand the user on the page.
   */
  it('offers a back control that pops the screen', () => {
    const { getByTestId } = renderWithTheme(<PromptDetailScreen />);

    fireEvent.press(getByTestId('detail-back'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('opens the category from the badge beside the author', () => {
    const { getByTestId } = renderWithTheme(<PromptDetailScreen />);

    fireEvent.press(getByTestId('detail-category'));
    expect(mockPush).toHaveBeenCalledWith('Category', {
      categoryId: 'cat_couple',
      title: 'Couple',
    });
  });

  // `navigate` would return to an EXISTING Category screen in the stack rather
  // than opening one on top, so Back would unwind past this prompt instead of
  // returning to it.
  it('stacks the category instead of reusing one already in the stack', () => {
    const { getByTestId } = renderWithTheme(<PromptDetailScreen />);

    fireEvent.press(getByTestId('detail-category'));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('still shows when the prompt is posted', () => {
    const { getByText } = renderWithTheme(<PromptDetailScreen />);
    expect(getByText('Ada Lovelace')).toBeTruthy();
  });
});
