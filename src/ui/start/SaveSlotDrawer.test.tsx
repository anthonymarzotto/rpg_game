import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SaveSlotDrawer } from './SaveSlotDrawer';
import { SlotSummary } from '../../core/storage/types';

describe('SaveSlotDrawer Component', () => {
  const mockSummaries: SlotSummary[] = [
    {
      slotId: 'slot-1',
      label: 'Expedition Slot 1',
      isEmpty: false,
      isCorrupted: false,
      campaignName: 'Astral Guardians',
      stage: 3,
      rosterCount: 4,
      victories: 5,
      defeats: 1,
      savedAt: 1711234567890
    },
    {
      slotId: 'slot-2',
      label: 'Expedition Slot 2',
      isEmpty: true
    },
    {
      slotId: 'slot-3',
      label: 'Expedition Slot 3',
      isEmpty: false,
      isCorrupted: true
    }
  ];

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <SaveSlotDrawer
        isOpen={false}
        slotSummaries={mockSummaries}
        onClose={vi.fn()}
        onResumeSlot={vi.fn()}
        onDeleteSlot={vi.fn()}
        onExportSlot={vi.fn()}
        onImportJson={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renders slot drawer with header and 3 slot cards when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <SaveSlotDrawer
        isOpen={true}
        slotSummaries={mockSummaries}
        onClose={vi.fn()}
        onResumeSlot={vi.fn()}
        onDeleteSlot={vi.fn()}
        onExportSlot={vi.fn()}
        onImportJson={vi.fn()}
      />
    );

    expect(html).toContain('EXPEDITION ARCHIVES');
    expect(html).toContain('Expedition Slot 1');
    expect(html).toContain('Astral Guardians');
    expect(html).toContain('Sector 3');
    expect(html).toContain('4 Heroes');
    expect(html).toContain('5 Triumphs / 1 Eclipses');

    // Slot 2 empty
    expect(html).toContain('Expedition Slot 2');
    expect(html).toContain('Empty Astral Void');
    expect(html).toContain('Import JSON');

    // Slot 3 corrupted
    expect(html).toContain('Expedition Slot 3');
    expect(html).toContain('Incompatible Save Version');
    expect(html).toContain('Reset Slot');
  });
});
