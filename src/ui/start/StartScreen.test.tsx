import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StartScreen } from './StartScreen';

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
});
