import { estimateReadingMinutes } from './guidePresentation';

describe('estimateReadingMinutes', () => {
  it('never returns less than one minute', () => {
    expect(estimateReadingMinutes('', [])).toBe(1);
  });

  it('counts paragraphs, callouts and bullet items but not images', () => {
    const paragraph = Array.from({ length: 300 }, () => 'từ').join(' ');
    const bullets = Array.from({ length: 100 }, () => 'món');

    expect(
      estimateReadingMinutes('', [
        { type: 'paragraph', text: paragraph },
        { type: 'image', url: 'https://example.com/a.jpg', alt: 'ảnh rất dài '.repeat(500) },
        { type: 'bulletList', items: bullets },
      ]),
    ).toBe(2);
  });
});
