/** Maps values between a data space domain and a pixel space range. */
export class LinearScale {
  private domainMin: number;

  private domainMax: number;

  private rangeMin: number;

  private rangeMax: number;

  constructor(
    domainMin: number,
    domainMax: number,
    rangeMin: number,
    rangeMax: number
  ) {
    this.domainMin = domainMin;
    this.domainMax = domainMax;
    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
  }

  /** Converts a data value to a pixel position. */
  scale(value: number): number {
    const domainSpan = this.domainMax - this.domainMin;
    if (domainSpan === 0) {
      return this.rangeMin;
    }
    return (
      this.rangeMin +
      ((value - this.domainMin) / domainSpan) * (this.rangeMax - this.rangeMin)
    );
  }

  /** Converts a pixel position back to a data value. */
  invert(position: number): number {
    const rangeSpan = this.rangeMax - this.rangeMin;
    if (rangeSpan === 0) {
      return this.domainMin;
    }
    return (
      this.domainMin +
      ((position - this.rangeMin) / rangeSpan) *
        (this.domainMax - this.domainMin)
    );
  }
}

export default LinearScale;
