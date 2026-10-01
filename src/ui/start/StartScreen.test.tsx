import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StartScreen } from './StartScreen';
import { SlotSummary } from '../../core/storage/types';

describe('StartScreen Component', () => {
  it('renders start screen with title, New Astral Expedition CTA, and version', () => {
    const onNewGame = vi.fn();
    const html = renderToStaticMarkup(<StartScreen onNewGame={onNewGame} />);

    expect(html).toContain('ASTRAL TACTICS');
    expect(html).toContain('New Astral Expedition');
    expect(html).toContain('v0.3.2');
  });

  it('renders continue button as disabled when canContinue is false', () => {
    const onNewGame = vi.fn();
    const html = renderToStaticMarkup(
      <StartScreen onNewGame={onNewGame} canContinue={false} />
    );

    expect(html).toContain('disabled=""');
  });

  it('renders continue button as enabled without disabled attribute when canContinue is true', () => {
    const onNewGame = vi.fn();
    const html = renderToStaticMarkup(
      <StartScreen onNewGame={onNewGame} canContinue={true} />
    );

    expect(html).not.toContain('disabled=""');
  });

  it('disables New Astral Expedition button when isFull is true and shows warning', () => {
    const onNewGame = vi.fn();
    const html = renderToStaticMarkup(
      <StartScreen onNewGame={onNewGame} isFull={true} />
    );

    expect(html).toContain('All 3 Expedition Vessels Bound');
    expect(html).toContain('disabled=""');
  });

  it('renders archives button and enables resume when slot summaries contain a saved run', () => {
    const mockSlots: SlotSummary[] = [
      {
        slotId: 'slot-1',
        label: 'Expedition Slot 1',
        isEmpty: false,
        isCorrupted: false,
        campaignName: 'Test Expedition',
        stage: 2
      },
      {
        slotId: 'slot-2',
        label: 'Expedition Slot 2',
        isEmpty: true
      },
      {
        slotId: 'slot-3',
        label: 'Expedition Slot 3',
        isEmpty: true
      }
    ];

    const html = renderToStaticMarkup(
      <StartScreen onNewGame={vi.fn()} slotSummaries={mockSlots} />
    );

    expect(html).toContain('Manage Archives &amp; Slots');
    // Continue button should not be disabled because slot 1 is occupied
    const resumeBtnMatch = html.match(/data-testid="start-continue-btn"[^>]*>/);
    expect(resumeBtnMatch?.[0]).not.toContain('disabled=""');
  });
});
