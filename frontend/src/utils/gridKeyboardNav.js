/**
 * Excel-style grid keyboard navigation (Tab / Shift+Tab / arrows).
 * Uses a 2D ref matrix: matrixRef.current[row][col] = HTMLElement or { focus() }.
 */

export function tryFocusCell(el) {
  if (!el || typeof el.focus !== 'function') return false;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
  return true;
}

/**
 * Tab order: left → right, wrap to next row first column; Shift+Tab reverses.
 */
export function gridTabNavigate({
  matrixRef,
  numRows,
  numCols,
  rowIndex,
  colIndex,
  forward,
  shouldSkip,
  onLand,
}) {
  let r = rowIndex;
  let c = colIndex;
  const maxSteps = Math.max(1, numRows * numCols) + 2;

  for (let step = 0; step < maxSteps; step++) {
    if (forward) {
      if (c < numCols - 1) c += 1;
      else if (r < numRows - 1) {
        r += 1;
        c = 0;
      } else {
        return;
      }
    } else {
      if (c > 0) c -= 1;
      else if (r > 0) {
        r -= 1;
        c = numCols - 1;
      } else {
        return;
      }
    }

    if (shouldSkip?.(r, c)) continue;
    const el = matrixRef.current[r]?.[c];
    if (tryFocusCell(el)) {
      onLand?.(r, c);
      return;
    }
  }
}

/**
 * Move in direction (dr, dc) until a focusable cell is found or boundary.
 */
export function gridDirectionalNavigate({
  matrixRef,
  numRows,
  numCols,
  rowIndex,
  colIndex,
  dr,
  dc,
  shouldSkip,
  onLand,
  maxSteps = 64,
}) {
  let r = rowIndex + dr;
  let c = colIndex + dc;
  let steps = 0;

  while (steps++ < maxSteps) {
    if (r < 0 || r >= numRows || c < 0 || c >= numCols) return;
    if (!shouldSkip?.(r, c)) {
      const el = matrixRef.current[r]?.[c];
      if (tryFocusCell(el)) {
        onLand?.(r, c);
        return;
      }
    }
    r += dr;
    c += dc;
  }
}

/**
 * @param {object} opts
 * @param {boolean} [opts.enableArrows]
 * @param {boolean} [opts.enableEnterDown] — Enter moves down same column (Excel-style)
 */
export function handleGridNavKeyDown(e, ctx) {
  const {
    matrixRef,
    numRows,
    numCols,
    rowIndex,
    colIndex,
    shouldSkip,
    onLand,
    enableArrows = true,
    enableEnterDown = true,
  } = ctx;

  if (e.key === 'Tab') {
    e.preventDefault();
    gridTabNavigate({
      matrixRef,
      numRows,
      numCols,
      rowIndex,
      colIndex,
      forward: !e.shiftKey,
      shouldSkip,
      onLand,
    });
    return true;
  }

  if (enableEnterDown && e.key === 'Enter' && !e.shiftKey) {
    const target = e.target;
    if (target && (target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return false;
    }
    e.preventDefault();
    gridDirectionalNavigate({
      matrixRef,
      numRows,
      numCols,
      rowIndex,
      colIndex,
      dr: 1,
      dc: 0,
      shouldSkip,
      onLand,
    });
    return true;
  }

  if (!enableArrows) return false;

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    gridDirectionalNavigate({
      matrixRef,
      numRows,
      numCols,
      rowIndex,
      colIndex,
      dr: 0,
      dc: 1,
      shouldSkip,
      onLand,
    });
    return true;
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    gridDirectionalNavigate({
      matrixRef,
      numRows,
      numCols,
      rowIndex,
      colIndex,
      dr: 0,
      dc: -1,
      shouldSkip,
      onLand,
    });
    return true;
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    gridDirectionalNavigate({
      matrixRef,
      numRows,
      numCols,
      rowIndex,
      colIndex,
      dr: 1,
      dc: 0,
      shouldSkip,
      onLand,
    });
    return true;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    gridDirectionalNavigate({
      matrixRef,
      numRows,
      numCols,
      rowIndex,
      colIndex,
      dr: -1,
      dc: 0,
      shouldSkip,
      onLand,
    });
    return true;
  }

  return false;
}
