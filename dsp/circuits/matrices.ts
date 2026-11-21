// ---------- dsp/circuits/matrices: dense matrices, for working out a circuit's model once ----------
// Small and dense: a circuit's nodes are a handful. Made and multiplied when a model is made, never per sample.

/** A dense matrix, its values row after row. */
export interface Matrix {
  readonly rows: number;
  readonly columns: number;
  readonly values: Float64Array;
}

export function zeros(rows: number, columns: number): Matrix {
  return { rows, columns, values: new Float64Array(rows * columns) };
}

/** a · b */
export function product(a: Matrix, b: Matrix): Matrix {
  const result = zeros(a.rows, b.columns);
  for (let row = 0; row < a.rows; row++) {
    for (let k = 0; k < a.columns; k++) {
      const factor = a.values[row * a.columns + k]!;
      for (let column = 0; column < b.columns; column++) {
        result.values[row * b.columns + column]! += factor * b.values[k * b.columns + column]!;
      }
    }
  }
  return result;
}

/** The inverse of a square matrix, by Gauss-Jordan elimination, the largest pivot first so rounding stays small. */
export function inverse(square: Matrix): Matrix {
  const size = square.rows;
  const left = Float64Array.from(square.values);
  const right = zeros(size, size).values;
  for (let i = 0; i < size; i++) {
    right[i * size + i] = 1;
  }
  for (let column = 0; column < size; column++) {
    const pivot = largestBelow(left, size, column);
    swapRows(left, size, column, pivot);
    swapRows(right, size, column, pivot);
    const scale = 1 / left[column * size + column]!;
    scaleRow(left, size, column, scale);
    scaleRow(right, size, column, scale);
    for (let row = 0; row < size; row++) {
      const factor = left[row * size + column]!;
      if (row === column || factor === 0) {
        continue;
      }
      subtractRow(left, size, row, column, factor);
      subtractRow(right, size, row, column, factor);
    }
  }
  return { rows: size, columns: size, values: right };
}

function largestBelow(values: Float64Array, size: number, column: number): number {
  let best = column;
  for (let row = column + 1; row < size; row++) {
    if (Math.abs(values[row * size + column]!) > Math.abs(values[best * size + column]!)) {
      best = row;
    }
  }
  if (values[best * size + column] === 0) {
    throw new Error('a circuit with a node nothing ties down: its matrix has no inverse');
  }
  return best;
}

function swapRows(values: Float64Array, size: number, one: number, other: number): void {
  if (one === other) {
    return;
  }
  for (let column = 0; column < size; column++) {
    const kept = values[one * size + column]!;
    values[one * size + column] = values[other * size + column]!;
    values[other * size + column] = kept;
  }
}

function scaleRow(values: Float64Array, size: number, row: number, scale: number): void {
  for (let column = 0; column < size; column++) {
    values[row * size + column]! *= scale;
  }
}

function subtractRow(values: Float64Array, size: number, row: number, from: number, factor: number): void {
  for (let column = 0; column < size; column++) {
    values[row * size + column]! -= factor * values[from * size + column]!;
  }
}
