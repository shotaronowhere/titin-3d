/** Pure DOM projection for the SC-27A five-beat Tour. */

export const STRETCH_CHAPTER_ID = 'stretch_spring';

/**
 * Declared Guided chrome budget for one resolved chapter. Projected canvas
 * targets are deliberately outside this count; browser tests measure the real DOM.
 * @param {{chapterId: string, chapterIndex: number, chapterCount: number}} state
 */
export function tourControlBudget({ chapterId, chapterIndex, chapterCount }) {
  const mechanics = chapterId === STRETCH_CHAPTER_ID ? 3 : 0;
  const previousDisabled = chapterIndex <= 0;
  const nextDisabled = chapterCount <= 0;
  return Object.freeze({
    visibleChromeAffordances: 4 + mechanics,
    tabbableChromeTargets: 4 + mechanics - Number(previousDisabled) - Number(nextDisabled),
  });
}

/**
 * This class receives resolved presentation state and writes it to existing DOM.
 * It owns no model, URL, evidence, mechanics, or scene decisions.
 */
export class TourView {
  /** @param {Record<string, HTMLElement>} elements */
  constructor(elements) {
    const required = [
      'progress', 'markers', 'question', 'title', 'summary',
      'previous', 'next', 'mechanics',
    ];
    for (const id of required) {
      if (!(elements?.[id] instanceof HTMLElement)) {
        throw new Error(`TourView: missing '${id}' element.`);
      }
    }
    this.elements = elements;
  }

  /**
   * @param {{chapter: any, chapterIndex: number, chapters: any[]}} resolved
   */
  render({ chapter, chapterIndex, chapters }) {
    const count = chapters.length;
    const current = chapterIndex + 1;
    const isFirst = chapterIndex === 0;
    const isFinal = chapterIndex === count - 1;
    const nextChapter = chapters[chapterIndex + 1] || chapters[0];
    const { progress, markers, question, title, summary, previous, next, mechanics } = this.elements;

    progress.textContent = `Beat ${current} of ${count}`;
    markers.replaceChildren(...chapters.map((record, index) => {
      const marker = document.createElement('span');
      marker.className = 'tour-progress-marker';
      marker.dataset.state = index < chapterIndex ? 'complete' : index === chapterIndex ? 'current' : 'upcoming';
      marker.setAttribute('aria-hidden', 'true');
      return marker;
    }));
    question.textContent = chapter.visual_question;
    title.textContent = chapter.title;
    summary.textContent = chapter.lay_summary;
    if (!(previous instanceof HTMLButtonElement) || !(next instanceof HTMLButtonElement)) {
      throw new Error('TourView: navigation controls must be buttons.');
    }
    previous.disabled = isFirst;
    previous.setAttribute('aria-label', isFirst ? 'Previous beat unavailable' : `Previous: ${chapters[chapterIndex - 1].title}`);
    next.disabled = count === 0;
    next.textContent = isFinal ? 'Replay' : 'Next';
    next.setAttribute('aria-label', isFinal ? 'Replay the Tour' : `Next: ${nextChapter.title}`);
    mechanics.hidden = chapter.id !== STRETCH_CHAPTER_ID;
    return tourControlBudget({ chapterId: chapter.id, chapterIndex, chapterCount: count });
  }
}
