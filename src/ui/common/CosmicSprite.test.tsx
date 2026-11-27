import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CosmicSprite } from './CosmicSprite';

describe('CosmicSprite', () => {
  it('renders decorative non-interactive starlight sprite by default', () => {
    const html = renderToStaticMarkup(<CosmicSprite size="lg" />);

    expect(html).toContain('data-testid="cosmic-sprite"');
    expect(html).toContain('cosmic-sprite--lg');
    expect(html).toContain('<span');
    expect(html).not.toContain('<button');
    expect(html).toContain('cosmic-sprite-svg');
    expect(html).toContain('cosmic-sprite-mote--gold');
  });

  it('renders an accessible button when interactive or onClick is provided', () => {
    const html = renderToStaticMarkup(
      <CosmicSprite
        size="md"
        interactive={true}
        pulsing={true}
        onClick={vi.fn()}
        ariaLabel="Greet your Cosmic Sprite"
        testId="hearth-cosmic-sprite"
      />
    );

    expect(html).toContain('<button');
    expect(html).toContain('data-testid="hearth-cosmic-sprite"');
    expect(html).toContain('cosmic-sprite--md');
    expect(html).toContain('cosmic-sprite--interactive');
    expect(html).toContain('cosmic-sprite--pulsing');
    expect(html).toContain('aria-label="Greet your Cosmic Sprite"');
  });
});
